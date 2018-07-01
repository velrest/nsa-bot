const Discord = require("discord.js");
const moment = require("moment");
const config = require("./config.json");
const client = new Discord.Client();
const http = require("http");
client.login(process.env.BOT_KEY);

// fooling heroku
http
  .createServer(function(req, res) {
    res.write("This is to keep heroku happy.");
    res.end();
  })
  .listen(8080);

const commands = {
  cleanall: message => {
    if (message.mentions.users.has(client.user.id)) {
      if (message.content.match("cleanall")) {
        if (permissionCheck(message.member, "cleanall")) {
          message.guild.channels
            .findAll("type", "text")
            .forEach(c => cleanChat(c, message.author));
        }
      }
    }
  },
  clean: message => {
    if (message.mentions.users.has(client.user.id)) {
      if (message.content.match("clean")) {
        if (permissionCheck(message.member, "clean")) {
          cleanChat(message.channel, message.author);
        }
      }
    }
  },
  "(.*cancer.*|.*overwatch.*|.*cancur.*|.*kill( me| discord))": message => {
    message.reply(splitEmojisTo200());
  }
};

client.on("ready", () => {
  log("Booted successfully");
});

client.on("message", message => {
  console.log(message.cleanContent);
  for (let command in commands) {
    if (message.content.match(command)) {
      commands[command](message);
      break;
    }
  }
});

client.on("voiceStateUpdate", (oldMember, newMember) => {
  if (oldMember.voiceChannelID != newMember.voiceChannelID) {
    console.log(newMember.voiceChannelID);
    let member = newMember;
    let messages = config.welcome.messages;
    let notificationsIn = config.welcome.notificationsIn;

    if (member.user.username in messages.user) {
      message = messages.user[member.user.username];
    } else {
      getOrderedRoles(member).forEach(function(role) {
        if (role.id in messages.role) {
          message = messages.role[role.id];
        }
      });
    }
    if (message === null) {
      message = messages.fallback;
    }
    if (member.voiceChannelID in notificationsIn) {
      getGuild()
        .channels.get(notificationsIn[member.voiceChannelID])
        .send(
          joinMessage(message, {
            user: member.user.username,
            channel: member.voiceChannel.name
          })
        );
    }
    log(
      `\`${oldMember.user.username}\` changed from \`${
        !oldMember.voiceChannelID ? "emptiness" : oldMember.voiceChannel.name
      }\` to \`${
        !newMember.voiceChannelID ? "emptiness" : newMember.voiceChannel.name
      }\``
    );
  }
});

client.on("presenceUpdate", (oldMember, newMember) => {
  if (oldMember.presence.status !== newMember.presence.status) {
    log(`\`${newMember.user.username}\` is now ${newMember.presence.status}`);
  }

  if (
    typeof newMember.presence.game !== "undefined" &&
    newMember.presence.game
  ) {
    if (!newMember.presence.game.equals(oldMember.presence.game))
      log(
        `\`${newMember.user.username}\` is now playing \`${
          newMember.presence.game.name
        }\``
      );
  } else log(`\`${newMember.user.username}\` stopped playing.`);
});

function getGuild() {
  return client.guilds.get(config.guild);
}

function getRole(id) {
  return getGuild().roles.get(id);
}

function memberHasRole(roles, member) {
  let inRoles = false;
  roles.some(r => {
    inRoles = member.roles.has(r);
    return inRoles;
  });
  return inRoles;
}

function permissionCheck(member, command) {
  let permissions = config.commandPermissions[command];
  if (
    adminCheck(member.user) ||
    memberHasRole(permissions.roles, member) ||
    permissions.users.includes(member.id)
  ) {
    return true;
  }
  log(`User \`${member.user.username}\` tried to use \`${command}\``);
  return false;
}

function adminCheck(user) {
  if (user.id === config.admin) {
    return true;
  } else {
    return false;
  }
}

function getOrderedRoles(member) {
  let roles = member.roles.array();
  roles.sort((a, b) => {
    return a.calculatedPosition - b.calculatedPosition;
  });
  return roles;
}

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function splitEmojisTo200() {
  let str = "";
  for (e of shuffle(emojis)) {
    if (str.length + e.length <= 200) {
      str += e;
    } else {
      break;
    }
  }
  return str;
}

function cleanChat(channel, user) {
  if (channel.id === config.clean.exlude && user.id !== config.admin) {
    log(
      `\`${user.username}\` tried to clear \`${
        channel.name
      }\` without permission`
    );
  } else {
    channel
      .fetchMessages({ limit: 100 })
      .then(ms => {
        log(
          "Cleaned in `" +
            channel.name +
            "` on behalf of `" +
            user.username +
            "`"
        );
        ms.filter(m => {
          return m.author.id === client.user.id ||
            m.mentions.users.has(client.user.id)
            ? true
            : false;
        })
          .array()
          .forEach(m => m.delete().catch(console.error));
      })
      .catch(console.error);
  }
}

function log(msg) {
  msg = moment().format("DD.MM.YY HH:mm:ss") + ": " + msg;
  getGuild()
    .channels.get(config.log)
    .send(msg)
    .catch(console.error);
}

function joinMessage(msg, values) {
  let placeHolders = [
    { p: "%{user}", v: values.user },
    { p: "%{channel}", v: values.channel }
  ];
  placeHolders.forEach(ph => {
    console.log(ph);
    msg = msg.replace(ph.p, ph.v);
    console.log(msg);
  });
  return msg;
}
