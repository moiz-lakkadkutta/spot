import React from 'react'
import { View } from 'react-native'
import type { ExerciseId } from '@spot/contracts'
import { T } from '../components'
import { strings } from '../strings'
import { tokens } from '../theme/tokens'
import { px } from '../theme/scale'
/** Three elements: the count, the range bar (sage when in range), one cue (amber rail). Never a fourth. Demo loop is the only moving image. */
export function Exercise({ exerciseId, setIndex, sets, reps, target, rangePct, inRange, cue, paused }: { exerciseId: ExerciseId; setIndex: number; sets: number; reps: number; target: number; rangePct: number; inRange: boolean; cue: string | null; paused: boolean }) {
  return (
    <View style={{ flex: 1, gap: px(24) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T variant="label" color={tokens.color.textSecondary}>{`${strings.names[exerciseId]} · ${strings.exercise.set(setIndex, sets)}`.toUpperCase()}</T>
        <T variant="label" color={tokens.color.textSecondary}>{Array.from({ length: sets }, (_, i) => (i < setIndex ? '●' : '○')).join(' ')}</T>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: px(60), alignItems: 'center' }}>
        <View style={{ width: px(520), gap: px(12) }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: px(16) }}>
            <T variant="count" accessibilityLiveRegion="polite" aria-label={`${reps} of ${target}`}>{reps}</T>
            <T variant="body" color={tokens.color.textSecondary}>{strings.exercise.of(target)}</T>
          </View>
          <View style={{ height: px(14), borderRadius: px(7), backgroundColor: tokens.color.surface2, overflow: 'hidden' }} accessibilityLabel={`Range ${Math.round(rangePct)} percent`}>
            <View style={{ width: `${Math.min(100, Math.max(0, rangePct))}%`, height: '100%', backgroundColor: inRange ? tokens.color.good : tokens.color.textSecondary }} />
          </View>
        </View>
        <View style={{ width: px(tokens.layout.demoW), height: px(tokens.layout.demoH), borderRadius: 8, backgroundColor: tokens.color.surface1 }} accessibilityLabel={`Demonstration: ${strings.names[exerciseId]}`} />
      </View>
      <View style={{ minHeight: px(80), borderLeftWidth: px(6), borderLeftColor: cue ? tokens.color.adjust : 'transparent', paddingLeft: px(20), justifyContent: 'center' }} accessibilityLiveRegion="polite">
        <T variant="cue">{paused ? strings.exercise.paused : cue ?? ''}</T>
      </View>
    </View>
  )
}
