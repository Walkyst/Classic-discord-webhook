'use strict'

// Sends the commits of a push or a pull request to a Discord webhook, like the GitHub integration of Discord does.
// No dependencies: the event comes from the file GitHub names in GITHUB_EVENT_PATH, the request goes with fetch.

const fs = require('fs')

const MAX_COMMITS = 12   // commits listed, the rest is "+ N more"
const MAX_MESSAGE = 50   // characters of the first line of a commit message: a line fits the embed without wrapping

function input(name) {
    return (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || '').trim()
}

function webhookUrl() {
    const url = input('url')
    if (url) return url
    const id = input('id')
    const token = input('token')
    if (!id || !token) throw new Error('Set the input "url", or "id" and "token", of the Discord webhook')
    return `https://discord.com/api/webhooks/${id}/${token}`
}

/** The first line of a commit message, shortened, with Discord markdown taken literally */
function summary(message) {
    let line = (message || '').split(/\r?\n/)[0].trim()
    if (line.length > MAX_MESSAGE) line = line.slice(0, MAX_MESSAGE - 1).trimEnd() + '…'
    return line.replace(/([\\*_~`|>\[\]])/g, '\\$1')
}

async function pullRequestCommits(pullRequest) {
    const commits = []
    for (let page = 1; commits.length < 250; page++) {
        const response = await fetch(`${pullRequest.commits_url}?per_page=100&page=${page}`, {
            headers: {
                Accept: 'application/vnd.github+json',
                ...(process.env.GITHUB_TOKEN ? {Authorization: `Bearer ${process.env.GITHUB_TOKEN}`} : {})
            }
        })
        if (!response.ok) throw new Error(`GitHub answered ${response.status} for the commits of the pull request`)
        const batch = await response.json()
        commits.push(...batch.map(c => ({
            sha: c.sha,
            url: c.html_url,
            message: c.commit.message,
            author: (c.commit.author && c.commit.author.name) || (c.author && c.author.login) || 'unknown'
        })))
        if (batch.length < 100) break
    }
    return commits
}

/** What happened: the commits, the branch, the link of the title. Null when there is nothing to tell. */
async function describe(event) {
    if (event.pull_request) {
        return {
            commits: await pullRequestCommits(event.pull_request),
            branch: event.pull_request.head.ref,
            link: `${event.pull_request.html_url}/commits`
        }
    }
    if (event.deleted || !Array.isArray(event.commits) || event.commits.length === 0) return null
    return {
        commits: event.commits.map(c => ({
            sha: c.id,
            url: c.url,
            message: c.message,
            author: (c.author && (c.author.name || c.author.username)) || 'unknown'
        })),
        branch: (event.ref || '').replace(/^refs\/(heads|tags)\//, ''),
        link: event.compare || `${event.repository.html_url}/commits`
    }
}

function embed(event, what) {
    const {commits, branch, link} = what
    const lines = commits.slice(0, MAX_COMMITS)
        .map(c => `[\`${c.sha.slice(0, 7)}\`](${c.url}) ${summary(c.message)} - ${c.author}`)
    if (commits.length > MAX_COMMITS) lines.push(`+ ${commits.length - MAX_COMMITS} more…`)
    const owner = event.repository.owner
    return {
        color: 0x7289DA,
        author: {name: owner.login, icon_url: owner.avatar_url, url: owner.html_url},
        title: `[${event.repository.name}:${branch}] ${commits.length} new commit${commits.length === 1 ? '' : 's'}`,
        url: link,
        description: lines.join('\n')
    }
}

async function post(url, body) {
    for (let attempt = 1; ; attempt++) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        })
        if (response.ok) return
        const text = await response.text()
        if (response.status === 429 && attempt < 3) {
            let wait = 2
            try { wait = JSON.parse(text).retry_after || wait } catch (_) {}
            await new Promise(resolve => setTimeout(resolve, Math.ceil(wait * 1000)))
            continue
        }
        throw new Error(`Discord answered ${response.status}: ${text}`)
    }
}

async function run() {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
    const what = await describe(event)
    if (!what || what.commits.length === 0) {
        console.log('No commits in this event, nothing to send')
        return
    }
    const body = {embeds: [embed(event, what)]}
    if (input('username')) body.username = input('username')
    if (input('avatar-url')) body.avatar_url = input('avatar-url')
    await post(webhookUrl(), body)
    console.log(`Sent ${what.commits.length} commit${what.commits.length === 1 ? "" : "s"} of ${event.repository.full_name}:${what.branch}`)
}

run().catch(error => {
    console.log(`::error::${error.message}`)
    process.exitCode = 1
})
