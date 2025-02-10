import React from 'react'
import { render, screen } from '@testing-library/react'
import '../../jest-setup/matchMedia'
import App from 'page'

describe("CPG Review Tool App", () => {
  it('Renders correctly without Plan Definition', () => {
    const { asFragment } = render(<App/>)
    expect(asFragment()).toMatchSnapshot()
  })
})

