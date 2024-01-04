import { Hono } from 'hono'
import { Ai } from '@cloudflare/ai'
import { streamText } from 'hono/streaming'
import { renderer } from './renderer'
import script from '../assets/script.js'

type Bindings = {
  AI: any
  DB: D1Database
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

app.get('/notes', async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM notes").all()
  const items = results.map(result => <tr><td>{result['id']}</td><td>{result['text']}</td></tr>)
  return c.render(
    <>
      <h2>ノート一覧</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Text</th>
          </tr>
        </thead>
        <tbody>
          {items}
        </tbody>
      </table>
    </>
  )
})

app.post('/notes', async (c) => {
  const { text } = await c.req.parseBody()
  if (text) {
    const { results } = await c.env.DB.prepare("INSERT INTO notes (text) VALUES (?) RETURNING *").bind(text).run()
    if (results.length > 0) {
      return c.redirect('/notes')
    }
  }
  return c.redirect('/notes/new')
})

app.get('/notes/new', (c) => {
  return c.render(
    <>
      <h2>ノート登録</h2>
      <form action='/notes' method='POST'>
        <textarea name="text" rows='10' style={{width: '100%'}}></textarea>
        <button type="submit">登録する</button>
      </form>
    </>
  )
})

export default app
