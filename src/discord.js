const discord = require('discord.js')
const MAX_MESSAGE_LENGTH = 50;

module.exports.send = (id, token, repo, branch, url, commits, size) => new Promise((resolve, reject) => {
    var client
    console.log("Preparing Webhook...")
    try {
        client = new discord.WebhookClient(id, token)
    }
    catch (error) {
        reject(error.message)
        return
    }

    client.send(createEmbed(repo, branch, url, commits, size)).then(() => {
        console.log("Successfully sent the message!")
        resolve()
    }, reject)
})

function createEmbed(repo, branch, url, commits, size) {
    console.log("Constructing Embed...");

    return new discord.RichEmbed()
        .setColor("#7289DA")
        .setAuthor(`${branch.owner.name}`, `${branch.owner_url.avatar_url}`, `${branch.owner_url}`)
        .setDescription(`[${repo.name}:${branch.name}] ${size} new ${size == 1 ? "commit" : "commits"}\n${getChangeLog(commits, size)}`)
}

function getChangeLog(commits, size) {
    var changelog = "";
    for (var i in commits) {
        if (i > 11) {
            changelog += `+ ${size - i} more...\n`;
            break;
        }

        var commit = commits[i];
        var sha = commit.id.substring(0, 6);
        var message = commit.message.length > MAX_MESSAGE_LENGTH ? (commit.message.substring(0, MAX_MESSAGE_LENGTH) + "...") : commit.message;
        changelog += `[\`${sha}\`](${commit.url}) ${message} - ${commit.author.username}\n`
    }

    return changelog;
}
