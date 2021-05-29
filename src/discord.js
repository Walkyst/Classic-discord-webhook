const discord = require('discord.js')
const MAX_MESSAGE_LENGTH = 50;

module.exports.send = (id, token, repository, branch, payload, commits, compare, size) => new Promise((resolve, reject) => {
    let client;
    console.log("Preparing Webhook...")
    try {
        client = new discord.WebhookClient(id, token)
    }
    catch (error) {
        reject(error.message)
        return
    }

    client.send(createEmbed(repository, branch, payload, commits, compare, size)).then(() => {
        console.log("Successfully sent the message!")
        resolve()
    }, reject)
})

function createEmbed(repository, branch, payload, commits, compare, size) {
    console.log("Constructing Embed...");

    return new discord.RichEmbed()
        .setColor("#7289DA")
        .setAuthor(`${payload.repository.owner.name}`, `${payload.repository.owner.avatar_url}`, `${payload.repository.owner.html_url}`)
        .setTitle(`[${repository.name}:${branch}] ${size} new ${size === 1 ? `commit` : `commits`}`)
        .setURL(`${compare}`)
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
        const sha = commit.id.substring(0, 6);
        const message = commit.message.length > MAX_MESSAGE_LENGTH ? (commit.message.substring(0, MAX_MESSAGE_LENGTH) + "...") : commit.message;
        changelog += `[\`${sha}\`](${commit.url}) ${message} - ${commit.author.username}\n`
    }

    return changelog;
}
