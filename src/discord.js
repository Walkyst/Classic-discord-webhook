const discord = require('discord.js')
const MAX_MESSAGE_LENGTH = 50;

module.exports.send = (id, token, repository, branch, payload, commits, basesha, size) => new Promise((resolve, reject) => {
    let client;
    console.log("Preparing Webhook...")
    try {
        client = new discord.WebhookClient(id, token)
    }
    catch (error) {
        reject(error.message)
        return
    }

    client.send(createEmbed(repository, branch, payload, commits, basesha, size)).then(() => {
        console.log("Successfully sent the message!")
        resolve()
    }, reject)
})

function createEmbed(repository, branch, payload, commits, basesha, size) {
    console.log("Constructing Embed...");

    return new discord.RichEmbed()
        .setColor("#7289DA")
        .setAuthor(`${payload.repository.owner.login}`, `${payload.repository.owner.avatar_url}`, `${payload.repository.owner.html_url}`)
        .setTitle(`[${repository.name}:${branch}] ${size} new ${size === 1 ? `commit` : `commits`}`)
        .setURL(`https://github.com/Walkyst/Minerea/compare/${basesha.substring(0, 12)}...${
                commits[commits.length - 1].sha ?
                    commits[commits.length - 1].sha.substring(0, 12) : commits[commits.length - 1].id.substring(0, 12)
            }`
        )
        .setDescription(`${getChangeLog(commits, size)}`)
}

function getChangeLog(commits, size) {
    let changelog = "";
    for (const i in commits) {
        if (i > 11) {
            changelog += `+ ${size - i} more...\n`;
            break;
        }

        const commit = commits[i];
        const author = commit.commit ? commit.commit.author.name : commit.author.name
        const sha = commit.commit ? commit.sha.substring(0, 7) : commit.id.substring(0, 7)
        const url = commit.commit ? commit.html_url : commit.url
        const length = commit.commit ? commit.commit.message.length : commit.message.length
        const message = length > MAX_MESSAGE_LENGTH ? ((commit.commit ? commit.commit.message.substring(0, MAX_MESSAGE_LENGTH) : commit.message.substring(0, MAX_MESSAGE_LENGTH)) + "...") : commit.commit ? commit.commit.message : commit.message;
        changelog += `[\`${sha}\`](${url}) ${message} - ${author}\n`
    }

    return changelog;
}
