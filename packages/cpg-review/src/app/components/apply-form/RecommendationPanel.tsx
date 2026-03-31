import { Card, Spin, Tag, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
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

const RecommendationPanel = ({ questionnaire, context }: RecommendationPanelProps) => {
  const eligibleItems = useMemo(
    () => flattenEligibleItems(questionnaire.item ?? []),
    [questionnaire.item]
  )

  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(eligibleItems.map((item) => [item.linkId, { status: 'loading' }]))
  )

  useEffect(() => {
    setItemStates(
      Object.fromEntries(eligibleItems.map((item) => [item.linkId, { status: 'loading' }]))
    )
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
    <div style={{ marginTop: '1.5rem' }}>
      <Text strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.75rem' }}>
        Questionnaire Recommendations
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {eligibleItems.map((item) => {
          const state = itemStates[item.linkId] ?? { status: 'loading' }
          return (
            <Card
              key={item.linkId}
              size="small"
              title={<Text>{item.text ?? item.linkId}</Text>}
              styles={{ body: { padding: '0.75rem 1rem' } }}
            >
              {state.status === 'loading' && (
                <Spin indicator={<LoadingOutlined spin />} size="small" />
              )}

              {state.status === 'error' && (
                <Text type="secondary">Recommendation unavailable</Text>
              )}

              {state.status === 'success' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Text strong>{state.data.recommendedAnswer}</Text>
                    <Tag
                      color={state.data.confidence < LOW_CONFIDENCE_THRESHOLD ? 'warning' : 'success'}
                    >
                      {Math.round(state.data.confidence * 100)}% confidence
                    </Tag>
                  </div>
                  <Paragraph
                    style={{ margin: 0 }}
                    type="secondary"
                  >
                    {state.data.rationale}
                  </Paragraph>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default RecommendationPanel
