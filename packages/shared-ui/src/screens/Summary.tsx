import React from 'react'
import { View } from 'react-native'
import type { ExerciseId } from '@spot/contracts'
import { Focusable, T } from '../components'
import { strings } from '../strings'
import { tokens } from '../theme/tokens'
import { px } from '../theme/scale'
/** Spoken first, then shown. Comparisons are only ever upward or neutral. A worse week is not mentioned on the TV. */
export function Summary({ results, comparison, early, onDone, onShare }: { results: Array<{ exerciseId: ExerciseId; reps: number }>; comparison: { exerciseId: ExerciseId; better: boolean } | null; early: boolean; onDone: () => void; onShare: () => void }) {
  const first = results[0]
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: px(24), maxWidth: px(1300) }}>
      <T variant="display">{early && first ? strings.summary.early(first.reps, strings.plural[first.exerciseId]) : strings.summary.title}</T>
      {!early ? <T variant="body">{results.map((r) => `${r.reps} ${strings.plural[r.exerciseId]}`).join(', ')}.</T> : null}
      {comparison ? <T variant="body" color={comparison.better ? tokens.color.good : tokens.color.textSecondary}>{comparison.better ? strings.summary.better(strings.plural[comparison.exerciseId]) : strings.summary.same}</T> : null}
      <View style={{ flexDirection: 'row', gap: px(16), marginTop: px(16) }}>
        <Focusable label={strings.summary.done} hasTVPreferredFocus onPress={onDone} style={{ width: px(360), height: px(tokens.layout.buttonH), justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.color.interactive }}><T variant="cue" color={tokens.color.ground}>{strings.summary.done}</T></Focusable>
        <Focusable label={strings.summary.share} onPress={onShare} style={{ width: px(480), height: px(tokens.layout.buttonH), justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.color.surface2 }}><T variant="cue">{strings.summary.share}</T></Focusable>
      </View>
    </View>
  )
}
