const messages = []

document.addEventListener('DOMContentLoaded', function () {
  const details = document.getElementById('details')
  const system = document.getElementById('system')
  const context = document.getElementById('context')
  const messageHistories = document.getElementById('messageHistories')
  const answer = document.getElementById('answer')
  document.getElementById('input-form').addEventListener('submit', function (event) {
    event.preventDefault()
    answer.innerHTML = 'loading...'
    const formData = new FormData(event.target)
    const query = formData.get('query')
    const similarityCutoff = formData.get('similarityCutoff')
    messages.push({
      role: 'user',
      content: query
    })
    fetch('/ai', {
      method: 'post',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ messages, similarityCutoff })
    }).then((response) => {
      response.json().then( data => {
        console.log(data)
        details.hidden = false
        system.innerHTML = data['systemMessage']
        context.innerHTML = data['contextMessage']
        messageHistories.innerHTML = ''
        data['messages'].map(m => {
          const li = document.createElement('li')
          li.innerHTML = m
          messageHistories.appendChild(li)
        })
        answer.innerHTML = data['answerMessage']
      })
    })
  })
})

function fetchChunked(target) {
  target.innerHTML = 'loading...'
  fetch('/ai', {
    method: 'post',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ messages })
  }).then((response) => {
    const reader = response.body.getReader()
    let decoder = new TextDecoder()
    target.innerHTML = ''
    reader.read().then(function processText({ done, value }) {
      if (done) {
        messages.push({
          role: 'assistant',
          content: target.innerHTML
        })
        return
      }
      target.innerHTML += decoder.decode(value)
      return reader.read().then(processText)
    })
  })
}
