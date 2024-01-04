import { Hono } from 'hono'
import { Ai } from '@cloudflare/ai'
import { stream, streamText } from 'hono/streaming'
import { renderer } from './renderer'
import script from '../assets/script.js'

type Bindings = {
  AI: any
}

type Answer = {
  response: string
}

type Message = {
  role: string
  content: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('*', renderer)

app.get('/script.js', (c) => {
  return c.body(script, 200, {
    'Content-Type': 'text/javascript'
  })
})

app.get('/', (c) => {
  return c.render(
    <>
      <h2>You</h2>
      <form id="input-form" autocomplete="off" method="post" action="/ai">
        <input
          type="text"
          name="query"
          style={{
            width: '100%'
          }}
        />
        <button type="submit">Send</button>
      </form>
      <h2>AI</h2>
      <pre
        id="ai-content"
        style={{
          'white-space': 'pre-wrap'
        }}
      ></pre>
    </>
  )
})

app.post('/ai', async (c) => {
  const { messages } = await c.req.json<{ messages: Message[] }>()
  const ai = new Ai(c.env.AI)
  const answer: Answer = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
    messages
  })
  const strings = [...answer.response]
  return streamText(c, async (stream) => {
    for (const s of strings) {
      stream.write(s)
      await stream.sleep(10)
    }
  })
})

export default app
