const Router = require('./router')

// async function handleRequest(request) {
//     const r = new Router()
//     // Replace with the approriate paths and handlers
//     r.get('.*/bar', () => new Response('responding for /bar'))
//     r.get('.*/foo', req => handler(req))
//     r.post('.*/foo.*', req => handler(req))
//     r.get('/demos/router/foo', req => fetch(req)) // return the response from the origin

//     r.get('/', () => new Response('Hello worker!')) // return a default message for the root route

//     const resp = await r.route(request)
//     return resp
// }

/*
 *  Request Transforms
 */

const transformAddTrustScoreHeader = request => {
    const newRequest = new Request(request)

    if (request.cf) {
        newRequest.headers.set('Cf-Ww-Ato-Flag', 2)
        newRequest.headers.set('Cf-Trust-Score', request.cf.clientTrustScore)
    }

    return newRequest
}

/*
 *  Request Responders
 */

const respondWithEcho = request => {
    try {
        // Serve a response from a flask server that echos the HTTP request
        return respondWithProductionEcho(request)
    } catch (err) {
        // Cannot do subdomain transform in development playgroup, so just echo
        console.log(err)
        return respondWithDevelopmentEcho(request)
    }
}

const respondWithProductionEcho = request => {
    const url = new URL(request.url)

    url.host = url.host.replace('rover.adampacholski', 'echo.adampacholski')
    if (url.toString() === request.url) {
        throw new Error('Development environment has no echo server')
    }

    return fetch(new Request(url, request))
}

const respondWithDevelopmentEcho = request => {
    const { body, bodyUsed, headers, method, redirect, url } = request
    const echo = { body, bodyUsed, headers, method, redirect, url }
    return new Response(JSON.stringify(echo, null, 2), { status: 200 })
}

/*
 *  Event handler
 */

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // Add the cf trust score header
    const withTrustScore = transformAddTrustScoreHeader(request)

    const r = new Router()

    r.get('.*', respondWithEcho)
    r.post('.*', respondWithEcho)

    const response = await r.route(request)
    return response
}
