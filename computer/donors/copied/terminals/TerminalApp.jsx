import React, { useState, useRef, useEffect } from 'react'
import { useBodyStore } from '../../hooks/useBodyStore'
import { EventBus } from '../../lib/EventBus'

export default function TerminalApp() {
  const [output, setOutput] = useState([
    { type: 'info', text: 'RESONANCE Terminal v1.0' },
    { type: 'info', text: 'Type 'help' for commands' },
    { type: 'info', text: '---' },
  ])
  const [input, setInput] = useState('')
  const [pyodideReady, setPyodideReady] = useState(false)
  const outputRef = useRef(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    // Try to load Pyodide
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'
    script.onload = async () => {
      try {
        await window.loadPyodide()
        setPyodideReady(true)
        setOutput((prev) => [...prev, { type: 'success', text: 'Pyodide ready ✓' }])
      } catch (e) {
        setOutput((prev) => [...prev, { type: 'error', text: 'Failed to load Pyodide' }])
      }
    }
    document.head.appendChild(script)
  }, [])

  const runCommand = (cmd) => {
    setOutput((prev) => [...prev, { type: 'command', text: `❯ ${cmd}` }])
    EventBus.emit('terminal:command', { command: cmd })

    const lower = cmd.toLowerCase().trim()
    const store = useBodyStore.getState()

    if (lower === 'help') {
      setOutput((prev) => [
        ...prev,
        { type: 'info', text: 'Commands: help, ls, cat [file], python [code], clear, status, morph [operation]' },
      ])
    } else if (lower === 'clear') {
      setOutput([])
    } else if (lower === 'ls') {
      const files = Object.keys(store.files)
      setOutput((prev) => [...prev, { type: 'info', text: `${files.length} files:
${files.join('\n')}` }])
    } else if (lower.startsWith('cat ')) {
      const fname = cmd.slice(4).trim()
      const content = store.files[fname]
      if (content) {
        setOutput((prev) => [...prev, { type: 'output', text: content.substring(0, 1000) }])
      } else {
        setOutput((prev) => [...prev, { type: 'error', text: `File not found: ${fname}` }])
      }
    } else if (lower.startsWith('python ')) {
      runPython(cmd.slice(7))
    } else if (lower === 'status') {
      setOutput((prev) => [
        ...prev,
        { type: 'info', text: `Phase: ${store.phase} | Vitality: ${store.vitality}% | Apps: ${store.installedApps.length} | Morph Artifacts: ${Object.keys(store.morphKernel.artifacts).length}` },
      ])
    } else if (lower.startsWith('morph ')) {
      handleMorphCommand(cmd.slice(6).trim())
    } else {
      setOutput((prev) => [...prev, { type: 'error', text: `Unknown command: ${cmd}` }])
    }
  }

  const runPython = async (code) => {
    if (!pyodideReady) {
      setOutput((prev) => [...prev, { type: 'error', text: 'Pyodide not ready yet' }])
      return
    }
    try {
      // Simplified - would need proper Pyodide integration
      setOutput((prev) => [...prev, { type: 'output', text: `[Python execution simulated]\n${code}` }])
    } catch (e) {
      setOutput((prev) => [...prev, { type: 'error', text: `Error: ${e.message}` }])
    }
  }

  const handleMorphCommand = (subcmd) => {
    const store = useBodyStore.getState()
    const [operation, ...args] = subcmd.split(' ')

    switch (operation) {
      case 'artifacts':
        const artifacts = Object.keys(store.morphKernel.artifacts)
        setOutput((prev) => [...prev, { type: 'info', text: `Morph Artifacts (${artifacts.length}):\n${artifacts.join('\n') || 'None'}` }])
        break
      case 'contracts':
        const contracts = Object.keys(store.morphKernel.contracts)
        setOutput((prev) => [...prev, { type: 'info', text: `Morph Contracts (${contracts.length}):\n${contracts.join('\n') || 'None'}` }])
        break
      case 'gates':
        setOutput((prev) => [...prev, { type: 'info', text: `Active Gates: ${Array.from(store.morphKernel.activeGates).join(', ') || 'None'}\nActive Channels: ${Array.from(store.morphKernel.activeChannels).join(', ') || 'None'}\nConsciousness Level: ${store.morphKernel.consciousnessLevel}` }])
        break
      case 'evolution':
        const log = store.morphKernel.evolutionLog
        setOutput((prev) => [...prev, { type: 'info', text: `Evolution Log (${log.length} entries):\n${log.slice(-5).map(e => `${e.type} @ ${new Date(e.timestamp).toLocaleTimeString()}`).join('\n') || 'None'}` }])
        break
      default:
        setOutput((prev) => [...prev, { type: 'info', text: 'Morph commands: artifacts, contracts, gates, evolution' }])
    }
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto bg-body-deep p-2.5 rounded-md font-mono text-xs leading-relaxed"
      >
        {output.map((line, i) => (
          <div
            key={i}
            className={`mb-1 ${
              line.type === 'command'
                ? 'text-accent-neural'
                : line.type === 'error'
                ? 'text-red-500'
                : line.type === 'success'
                ? 'text-green-500'
                : line.type === 'output'
                ? 'text-text-primary whitespace-pre-wrap'
                : 'text-text-dim'
            }`}
          >
            {line.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <span className="text-accent-neural font-mono text-xs">❯</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              runCommand(input)
              setInput('')
            }
          }}
          placeholder="Enter command..."
          className="flex-1 bg-transparent border-none text-accent-neural font-mono text-xs outline-none"
        />
      </div>
    </div>
  )
}
