const messages = []

document.addEventListener('DOMContentLoaded', function () {
  const system = document.getElementById('system')
  const context = document.getElementById('context')
  const messageHistories = document.getElementById('messageHistories')
  const answer = document.getElementById('answer')
  document.getElementById('input-form').addEventListener('submit', function (event) {
    event.preventDefault()
    answer.innerHTML = 'loading...'
    const formData = new FormData(event.target)
    const query = formData.get('query')
    messages.push({
      role: 'user',
      content: query
    })
    fetch('/ai', {
      method: 'post',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ messages })
    }).then((response) => {
      response.json().then( data => {
        system.innerHTML = data['systemMessage']
        context.innerHTML = data['contextMessage']
        messageHistories.innerHTML = data['messages']
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
