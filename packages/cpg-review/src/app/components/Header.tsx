import Link from 'next/link'
import BrowserResolver from 'resolver/browser'
import '@/styles/globals.css'

export interface HeaderProps {
  resolver: BrowserResolver | undefined
  planDefinition: fhir4.PlanDefinition | undefined
  showUploadPage: boolean
  setShowUploadPage: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Header({
  resolver,
  planDefinition,
  showUploadPage,
  setShowUploadPage,
}: HeaderProps) {
  return (
    <>
      <Link
        href="https://www.vermonster.com/products"
        target="_blank"
        aria-label="visit reason healthcare"
        className="logo"
      >
        <span className="r">r</span>
        <span>.</span>
        <span>h</span>
      </Link>
      <div className="links">
        {!showUploadPage && (
          <button
            className="nav-button"
            aria-label="add new plan"
            onClick={() => setShowUploadPage(true)}
          >
            Upload
          </button>
        )}
        {showUploadPage && resolver != null && planDefinition != null && (
          <button
            className="nav-button"
            aria-label="review current plan"
            onClick={() => setShowUploadPage(false)}
          >
            Review
          </button>
        )}
        <Link
          href="https://github.com/reason-healthcare/reason-framework"
          target="_blank"
          className="nav-button"
          aria-label="documentation"
        >
          Github
        </Link>
      </div>
    </>
  )
}
