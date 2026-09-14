import React from 'react'
import { View } from 'react-native'
import type { Framing as FramingT } from '@spot/contracts'
import { Focusable, T } from '../components'
import { strings } from '../strings'
import { tokens } from '../theme/tokens'
import { px } from '../theme/scale'
/** Instruction · outline with three check marks · phone status. Skeleton appears only here. Auto-advances 2 s after all checks pass. */
export function Framing({ camera, framing, phone, onSkip, onManual }: { camera: 'side' | 'front'; framing: FramingT | null; phone: { name: string; pct: number } | null; onSkip: () => void; onManual: () => void }) {
  const check = (ok: boolean | undefined, label: string) => <T key={label} variant="body" color={ok ? tokens.color.good : tokens.color.textSecondary}>{ok ? '✓' : '○'} {label}</T>
  return (
    <View style={{ flex: 1, gap: px(28) }}>
      <T variant="display">{camera === 'side' ? strings.framing.title : strings.framing.front}</T>
      <View style={{ alignSelf: 'center', width: px(520), height: px(640), borderRadius: 12, borderWidth: px(3), borderColor: tokens.color.surface2, justifyContent: 'center', alignItems: 'center', gap: px(16) }}>
        {check(framing?.head, strings.framing.head)}{check(framing?.hips, strings.framing.hips)}{check(framing?.feet, strings.framing.feet)}
        {framing && !framing.feet ? <T variant="cue" color={tokens.color.adjust} style={{ textAlign: 'center', paddingHorizontal: px(24) }}>{strings.framing.stepBack}</T> : null}
        {framing?.light === 'dark' ? <T variant="cue" color={tokens.color.adjust} style={{ textAlign: 'center', paddingHorizontal: px(24) }}>{strings.framing.dark}</T> : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T variant="body" color={phone ? tokens.color.textSecondary : tokens.color.adjust} accessibilityLiveRegion="polite">{phone ? strings.framing.phone(phone.name, phone.pct) : strings.framing.lost}</T>
        <View style={{ flexDirection: 'row', gap: px(16) }}>
          {!phone ? <Focusable label={strings.framing.manual} onPress={onManual} style={{ paddingHorizontal: px(28), paddingVertical: px(18), backgroundColor: tokens.color.surface2 }}><T variant="body">{strings.framing.manual}</T></Focusable> : null}
          <Focusable label={strings.framing.skip} hasTVPreferredFocus onPress={onSkip} style={{ paddingHorizontal: px(28), paddingVertical: px(18), backgroundColor: tokens.color.surface2 }}><T variant="body">{strings.framing.skip}</T></Focusable>
        </View>
      </View>
    </View>
  )
}
