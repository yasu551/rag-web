document.addEventListener('DOMContentLoaded', function () {
  const target = document.getElementById('ai-content')
  document.getElementById('input-form').addEventListener('submit', function (event) {
    event.preventDefault()
    target.innerHTML = 'loading...'
    const formData = new FormData(event.target)
    const query = formData.get('query')
    fetch('/ai', {
      method: 'post',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: query
          }
        ]
      })
    }).then((response) => {
      response.text().then((data) => {
        target.innerHTML = data
      })
    })
  })
})
