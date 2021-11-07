const core = require('@actions/core')
const github = require('@actions/github')
const axios = require('axios')
const webhook = require('../src/discord.js')

async function run() {
	const payload = github.context.payload

	let commits;
	let branch;
	let basesha;
	if (payload.pull_request != null) {
		const prcommits = await axios.get(payload.pull_request.commits_url,
			{
				headers: {
					Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
				}
			}
		)
		commits = prcommits.data
		branch = payload.pull_request.head.ref
		basesha = payload.pull_request.base.sha
	} else {
		commits = payload.commits
		branch = payload.ref.split('/')[payload.ref.split('/').length - 1]
		basesha = payload.before
	}

	const repository = payload.repository
	const size = commits.length

	console.log(`Received ${size} commits...`)

	const id = core.getInput("id")
	const token = core.getInput("token")

	webhook.send(id, token, repository, branch, payload, commits, basesha, size).catch(err => core.setFailed(err.message));
}

try {
	run()
} catch (error) {
	core.setFailed(error.message)
}
