import { Spin, Tag, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  RecommendationBatchResponse,
  RecommendationResponse,
} from '../../types/recommendation'
import { chunkItems, DEFAULT_RECOMMENDATION_CHUNK_SIZE } from '../../llm/chunkItems'

const { Text, Paragraph } = Typography

const EXCLUDED_TYPES: fhir4.QuestionnaireItem['type'][] = ['display', 'group']
const LOW_CONFIDENCE_THRESHOLD = 0.5
const CLIENT_BATCH_CHUNK_SIZE = DEFAULT_RECOMMENDATION_CHUNK_SIZE

function isHiddenItem(item: fhir4.QuestionnaireItem): boolean {
  return (
    item.extension?.some(
      (e) =>
        e.url === 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden' &&
        e.valueBoolean === true
    ) ?? false
  )
}

function flattenEligibleItems(items: fhir4.QuestionnaireItem[] = []): fhir4.QuestionnaireItem[] {
  return items.flatMap((item) => {
    if (isHiddenItem(item)) {
      return []
    }

    const nestedItems = flattenEligibleItems(item.item ?? [])
    if (EXCLUDED_TYPES.includes(item.type)) {
      return nestedItems
    }

    return [item, ...nestedItems]
  })
}

type ItemState =
  | { status: 'loading' }
  | { status: 'success'; data: RecommendationResponse }
  | { status: 'error' }

interface RecommendationPanelProps {
  questionnaire: fhir4.Questionnaire
  context: fhir4.Bundle
}

function InlineRecommendation({ state }: { state: ItemState }) {
  if (state.status === 'loading') {
    return (
      <div className="questionnaire-inline-recommendation questionnaire-inline-recommendation-loading">
        <Spin indicator={<LoadingOutlined spin />} size="small" />
        <Text type="secondary">Generating recommendation...</Text>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="questionnaire-inline-recommendation">
        <Text type="secondary">Recommendation unavailable</Text>
      </div>
    )
  }

  return (
    <div className="questionnaire-inline-recommendation">
      <div className="questionnaire-inline-recommendation-header">
        <Text type="secondary" className="questionnaire-inline-recommendation-label">
          Guidance
        </Text>
        <Tag
          color={state.data.confidence < LOW_CONFIDENCE_THRESHOLD ? 'warning' : 'success'}
        >
          {Math.round(state.data.confidence * 100)}% confidence
        </Tag>
      </div>
      <Text strong className="questionnaire-inline-recommendation-answer">
        {state.data.recommendedAnswer}
      </Text>
      <Paragraph className="questionnaire-inline-recommendation-rationale" type="secondary">
        {state.data.rationale}
      </Paragraph>
      <Text type="secondary" className="questionnaire-inline-recommendation-note">
        AI can make mistakes. Review before applying.
      </Text>
    </div>
  )
}

const RecommendationPanel = ({ questionnaire, context }: RecommendationPanelProps) => {
  const eligibleItems = useMemo(
    () => flattenEligibleItems(questionnaire.item ?? []),
    [questionnaire.item]
  )

  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(eligibleItems.map((item) => [item.linkId, { status: 'loading' }]))
  )
  const [itemContainers, setItemContainers] = useState<Record<string, HTMLElement>>({})

  useEffect(() => {
    setItemStates(
      Object.fromEntries(eligibleItems.map((item) => [item.linkId, { status: 'loading' }]))
    )
  }, [eligibleItems, questionnaire.id])

  useEffect(() => {
    if (typeof document === 'undefined' || eligibleItems.length === 0) {
      setItemContainers({})
      return
    }

    const syncContainers = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-linkid]'))
      const nextEntries = eligibleItems.flatMap((item) => {
        const container = nodes.find((node) => node.dataset.linkid === item.linkId)
        return container ? [[item.linkId, container] as const] : []
      })
      const next = Object.fromEntries(nextEntries)

      setItemContainers((prev) => {
        const prevEntries = Object.entries(prev)
        if (
          prevEntries.length === nextEntries.length &&
          prevEntries.every(([linkId, node]) => next[linkId] === node)
        ) {
          return prev
        }

        return next
      })
    }

    syncContainers()

    const observer = new MutationObserver(syncContainers)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [eligibleItems, questionnaire.id])

  useEffect(() => {
    if (eligibleItems.length === 0) return

    const fetchAll = async () => {
      const itemChunks = chunkItems(eligibleItems, CLIENT_BATCH_CHUNK_SIZE)

      for (const chunk of itemChunks) {
        try {
          const res = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: chunk, context, questionnaire }),
          })

          const data = (await res.json()) as RecommendationBatchResponse
          const recommendations = data.recommendations ?? {}

          setItemStates((prev) => {
            const next = { ...prev }

            for (const item of chunk) {
              const recommendation = recommendations[item.linkId]
              if (!recommendation || recommendation.error) {
                next[item.linkId] = { status: 'error' }
              } else {
                next[item.linkId] = { status: 'success', data: recommendation }
              }
            }

            return next
          })
        } catch {
          setItemStates((prev) => {
            const next = { ...prev }
            for (const item of chunk) {
              next[item.linkId] = { status: 'error' }
            }
            return next
          })
        }
      }
    }

    void fetchAll()
  }, [eligibleItems, questionnaire.id, context, questionnaire])

  if (eligibleItems.length === 0) return null

  return (
    <>
      {eligibleItems.map((item) => {
        const container = itemContainers[item.linkId]
        if (!container) {
          return null
        }

        const state = itemStates[item.linkId] ?? { status: 'loading' }

        return createPortal(<InlineRecommendation state={state} />, container, item.linkId)
      })}
    </>
  )
}

export default RecommendationPanel
