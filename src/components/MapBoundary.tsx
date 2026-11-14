import { Component, type ReactNode } from 'react'

/**
 * If anything inside a map throws (a library error, odd tile data), show the fallback text in place of
 * the map instead of letting the error blank the whole page. Everything on the map is also in the page text.
 */
export class MapBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('Map error, showing text instead:', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
