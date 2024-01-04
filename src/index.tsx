import { Hono } from 'hono'
import { Ai } from '@cloudflare/ai'
import { streamText } from 'hono/streaming'
import { renderer } from './renderer'
import script from '../assets/script.js'

type Bindings = {
  AI: any
  DB: D1Database
  VECTORIZE_INDEX: VectorizeIndex
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
      <form action='/notes' method='get'>
        <button type='submit'>ノート一覧へ</button>
      </form>
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
      <form action='/' method='get'>
        <button type='submit'>ホームへ</button>
      </form>
      <form action='/notes/new' method='get'>
        <button type='submit'>ノートを登録する</button>
      </form>      
    </>
  )
})

app.post('/notes', async (c) => {
  const { text } = await c.req.parseBody()
  if (!text) {
    return c.redirect('/notes/new')
  }

  const { results } = await c.env.DB.prepare("INSERT INTO notes (text) VALUES (?) RETURNING *").bind(text).run()
  if ( results.length <= 0) {
    return c.redirect('/notes/new')
  }

  const ai = new Ai(c.env.AI)
  const { data } = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [text] })
  const values = data[0]
  if (!values) {
    return c.redirect('/notes/new')
  }
  const { id } = results[0]
  const inserted = await c.env.VECTORIZE_INDEX.upsert([
    {
      id: id.toString(),
      values,
    }
  ])
  console.log(inserted)
  return c.redirect('/notes')
})

app.get('/notes/new', (c) => {
  return c.render(
    <>
      <h2>ノート登録</h2>
      <form action='/notes' method='POST'>
        <textarea name="text" rows='10' style={{width: '100%'}}></textarea>
        <button type="submit">登録する</button>
      </form>
      <form action='/notes' method='get'>
        <button type='submit'>ノート一覧へ</button>
      </form>      
    </>
  )
})

export default app
