import React from 'react'
import { Root } from '@spot/shared-ui'
// Vega entry. Sizes are px at 1080p → scale 1.
export default function App() { return <Root apiBaseUrl={'https://api.spot.example'} scale={1} /> }
