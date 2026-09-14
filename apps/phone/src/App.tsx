import React, { useEffect, useRef, useState } from 'react'
import { Pressable, SafeAreaView, Text, TextInput, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { io, type Socket } from 'socket.io-client'
import { POSE_HTML } from './pose-html'

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'
const C = { ground: '#121719', surface: '#1B2225', text: '#EDEEEA', dim: '#A9B3B0', good: '#7FB89A', adjust: '#E0B072', blue: '#8FB1C9' }

/**
 * The phone is a dumb sensor: camera → MediaPipe Pose Landmarker (Tasks JS, in a WebView — the robust path; a native
 * Expo module is the SPOT-001 alternative) → 33 landmarks at ≤ 15 fps → Socket.IO `frame`. No pixels ever leave the phone.
 */
export default function App() {
  const [code, setCode] = useState('')
  const [joined, setJoined] = useState(false)
  const [fps, setFps] = useState(0)
  const socket = useRef<Socket | null>(null)
  const last = useRef(0)
  const join = () => { const s = io(API); s.emit('join', { code: code.toUpperCase(), role: 'phone' }); socket.current = s; setJoined(true) }
  useEffect(() => () => { socket.current?.disconnect() }, [])
  const onMessage = (e: { nativeEvent: { data: string } }) => {
    const msg = JSON.parse(e.nativeEvent.data) as { type: 'frame'; t: number; lm: Array<{ x: number; y: number; z: number; v: number }> } | { type: 'fps'; fps: number }
    if (msg.type === 'fps') return setFps(msg.fps)
    if (msg.t - last.current < 1000 / 15) return // downsample to 15 fps
    last.current = msg.t
    socket.current?.volatile.emit('frame', { code: code.toUpperCase(), frame: { t: msg.t, lm: msg.lm } })
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ground }}>
      {!joined ? (
        <View style={{ flex: 1, padding: 24, gap: 20, justifyContent: 'center' }}>
          <Text style={{ color: C.text, fontSize: 28, fontWeight: '600' }}>Type the code from your TV</Text>
          <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={6} placeholder="ABC234" placeholderTextColor={C.dim} style={{ color: C.text, fontSize: 40, letterSpacing: 10, backgroundColor: C.surface, padding: 18, borderRadius: 10, textAlign: 'center' }} accessibilityLabel="Six character code" />
          <Pressable onPress={join} accessibilityRole="button" style={{ backgroundColor: C.blue, padding: 20, borderRadius: 10, minHeight: 60, justifyContent: 'center' }}><Text style={{ color: C.ground, fontSize: 22, textAlign: 'center', fontWeight: '600' }}>Connect</Text></Pressable>
          <Text style={{ color: C.dim, fontSize: 16, lineHeight: 24 }}>Spot uses the camera to see the shape of your movement. It never sends pictures.</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView source={{ html: POSE_HTML }} onMessage={onMessage} mediaPlaybackRequiresUserAction={false} allowsInlineMediaPlayback javaScriptEnabled style={{ flex: 1, backgroundColor: '#000' }} />
          <View style={{ padding: 16, gap: 6 }}>
            <Text style={{ color: C.text, fontSize: 20 }}>Prop the phone at hip height, sideways, about 3 steps away.</Text>
            <Text style={{ color: C.dim }}>Connected · {code.toUpperCase()} · {fps} fps</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}
