import { Hono } from 'hono'
import { Ai } from '@cloudflare/ai'
import { stream, streamText } from 'hono/streaming'

type Bindings = {
  AI: any
}

type Answer = {
  response: string
}

type Message = {
  content: string
  role: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/ai', async (c) => {
  const ai = new Ai(c.env.AI)
  const answer: Answer = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
    messages: [
      {
        role: 'user',
        content: `What is Cloudflare Workers. You respond in less than 100 words.`
      }
    ]
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
