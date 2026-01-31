import { useState, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
} from '@/components/ui/emoji-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function AlertsSection() {
  const [alertMessage, setAlertMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const createAlert = useMutation(api.alerts.create)
  const activeAlerts = useQuery(api.alerts.getActive)

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newMessage = alertMessage.slice(0, start) + emoji + alertMessage.slice(end)
      setAlertMessage(newMessage)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 0)
    } else {
      setAlertMessage(prev => prev + emoji)
    }
    setEmojiPickerOpen(false)
  }

  const handleSendAlert = async () => {
    if (!alertMessage.trim()) return
    setSending(true)
    setSendSuccess(false)
    try {
      await createAlert({ message: alertMessage })
      setAlertMessage('')
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to send alert:', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Send Alert to All Users</h2>
        <p className="text-sm text-gray-500 mb-4">
          Broadcast a message to all logged-in users. They&apos;ll see a notification
          indicator until they view it. You can include emojis.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={alertMessage}
            onChange={(e) => setAlertMessage(e.target.value)}
            placeholder="Type your alert message here..."
            className="w-full h-24 px-3 py-2 pr-12 border border-amber-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            maxLength={500}
          />
          <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="absolute right-2 top-2 p-1.5 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                title="Add emoji"
              >
                <span className="text-lg">😊</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[352px] h-[400px] p-0" align="end">
              <EmojiPicker
                className="h-full"
                onEmojiSelect={({ emoji }) => handleEmojiSelect(emoji)}
              >
                <EmojiPickerSearch placeholder="Search emoji..." />
                <EmojiPickerContent />
              </EmojiPicker>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-amber-600">
            {alertMessage.length}/500 characters
          </span>
          <button
            onClick={handleSendAlert}
            disabled={!alertMessage.trim() || sending}
            className="px-4 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Alert'}
          </button>
        </div>
        {sendSuccess && (
          <p className="mt-2 text-sm text-green-600">Alert sent successfully!</p>
        )}
      </div>

      {activeAlerts && activeAlerts.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Active Alerts ({activeAlerts.length}) - expire after 24h
          </h3>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div key={alert._id} className="border-l-2 border-gray-300 pl-3">
                <p className="text-gray-800">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
