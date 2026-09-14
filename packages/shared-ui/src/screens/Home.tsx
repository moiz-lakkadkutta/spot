import React from 'react'
import { View } from 'react-native'
import type { Plan } from '@spot/contracts'
import { Focusable, T } from '../components'
import { strings } from '../strings'
import { tokens } from '../theme/tokens'
import { px } from '../theme/scale'
export function Home({ plan, phonePaired, onStart, onConnect }: { plan: Plan | null; phonePaired: boolean; onStart: () => void; onConnect: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: px(24), maxWidth: px(1300) }}>
      <T variant="label" color={tokens.color.textSecondary}>{strings.home.today.toUpperCase()}</T>
      <T variant="display">{plan ? strings.home.meta(plan.exercises.length, plan.minutes) : '…'}</T>
      <View style={{ gap: px(10) }}>{plan?.exercises.map((e) => <T key={e.id} variant="body" color={tokens.color.textSecondary}>{strings.names[e.id]} · {e.sets} × {e.reps}</T>)}</View>
      <Focusable label={phonePaired ? strings.home.start : strings.home.connect} hasTVPreferredFocus onPress={phonePaired ? onStart : onConnect} style={{ width: px(tokens.layout.buttonW), height: px(tokens.layout.buttonH), justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.color.interactive, marginTop: px(16) }}>
        <T variant="display" color={tokens.color.ground}>{phonePaired ? strings.home.start : strings.home.connect}</T>
      </Focusable>
    </View>
  )
}
