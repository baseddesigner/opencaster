const fs = require('node:fs')

async function newPage() {
  const res = await fetch('http://127.0.0.1:9223/json/new?http://127.0.0.1:3039/', { method: 'PUT' })
  if (!res.ok) throw new Error(`new page failed ${res.status}`)
  return res.json()
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result || {})
    }
  }
  return new Promise((resolve, reject) => {
    ws.onerror = reject
    ws.onopen = () => resolve({
      send(method, params = {}) {
        const msgId = ++id
        ws.send(JSON.stringify({ id: msgId, method, params }))
        return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }))
      },
      close() { ws.close() }
    })
  })
}

async function main() {
  const page = await newPage()
  const cdp = await connect(page.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:3039/?qa=${Date.now()}` })
  await new Promise((resolve) => setTimeout(resolve, 2500))
  const metrics = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const q = (s) => document.querySelector(s)?.getBoundingClientRect()
      const rect = (r) => r ? { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) } : null
      return {
        innerWidth,
        innerHeight,
        docScroll: document.documentElement.scrollWidth,
        bodyScroll: document.body.scrollWidth,
        header: rect(q('.site-header')),
        search: rect(q('.quick-search')),
        mobileNav: rect(q('.mobile-nav')),
        firstCast: rect(q('.cast-card')),
        desktopNavDisplay: getComputedStyle(document.querySelector('.desktop-nav')).display,
        mobileNavPosition: getComputedStyle(document.querySelector('.mobile-nav')).position
      }
    })()`
  })
  const value = metrics.result.value
  if (value.docScroll > value.innerWidth || value.bodyScroll > value.innerWidth) throw new Error('mobile page overflows horizontally')
  if (value.mobileNavPosition !== 'fixed') throw new Error('mobile nav is not fixed to viewport')
  if (value.mobileNav.y < value.innerHeight - 100) throw new Error('mobile nav is not at bottom')
  if (value.search.bottom > value.mobileNav.y) throw new Error('mobile nav overlaps search')
  if (!value.firstCast || value.firstCast.y > 650) throw new Error('first cast is too low on mobile')
  if (value.firstCast.bottom > value.mobileNav.y && value.firstCast.y > 650) throw new Error('mobile nav covers too much of first cast')
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync('/tmp/farcaster-mobile-qa.png', Buffer.from(shot.data, 'base64'))
  console.log(JSON.stringify(metrics.result.value, null, 2))
  console.log('/tmp/farcaster-mobile-qa.png')
  cdp.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
