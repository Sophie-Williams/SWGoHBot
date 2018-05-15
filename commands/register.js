const Command = require('../base/Command');

class Register extends Command {
    constructor(client) {
        super(client, {
            name: 'register',
            category: "SWGoH",
            aliases: ['reg']
        });
    }

    async run(client, message, [action, userID, allyCode, ...args], options) { // eslint-disable-line no-unused-vars
        const level = options.level;
        const acts = ['add', 'update', 'remove'];
        if (!action || !acts.includes(action.toLowerCase())) {
            return message.channel.send('You need to choose either `add`, `remove`, or `update`.');
        }
        action = action.toLowerCase();
        if (!userID) {
            return message.channel.send(message.language.get('COMMAND_REGISTER_MISSING_ARGS'));
        } else {
            if (userID === 'me') {
                userID = message.author.id;
            } else if (client.isUserID(userID)) {
                userID = userID.replace(/[^\d]*/g, '');
                // If they are trying to add someone else and they don't have the right perms, stop em
                if (userID !== message.author.id) {
                    if (level < 3) {
                        return message.channel.send(message.language.get('COMMAND_SHARDTIMES_MISSING_ROLE'));
                    } else if (!message.guild.members.has(userID) && action === 'add') {  // If they are trying to add someone that is not in their server
                        return message.channel.send('You can only add users that are in your server.');
                    } else if (!message.guild.members.has(userID) && action === 'remove' && level < 4) {   // If they are trying to remove someone else 
                        return message.channel.send('You cannot remove other people');
                    }
                }
            } else {
                // Bad name, grumblin time
                return message.channel.send(message.language.get('COMMAND_SHARDTIMES_INVALID_USER'));
            }
        }
        const exists = await client.allyCodes.findOne({where: {id: userID}})
            .then(token => token != null)
            .then(isUnique => isUnique);

        switch (action) {
            case 'add':
                if (!allyCode) {
                    return message.channel.send(message.language.get('COMMAND_REGISTER_MISSING_ALLY'));
                } else {
                    if (client.isAllyCode(allyCode)) {
                        allyCode = allyCode.replace(/[^\d]*/g, '');
                    } else {
                        // Bad code, grumblin time
                        return message.channel.send(message.language.get('COMMAND_REGISTER_INVALID_ALLY', allyCode));
                    }
                }
                if (!exists) {
                    // Sync up their swgoh account
                    message.channel.send(message.language.get('COMMAND_REGISTER_PLEASE_WAIT')).then(async msg => {
                        await client.swgohAPI.updatePlayer(allyCode).then(async (u) => {
                            if (!u) {
                                await msg.edit(message.language.get('COMMAND_REGISTER_FAILURE'));
                            } else {
                                await client.allyCodes.create({
                                    id: userID,
                                    allyCode: allyCode
                                });
                                await msg.edit(message.language.get('COMMAND_REGISTER_SUCCESS', u.name));
                            }
                        });
                    });
                } else {
                    return message.channel.send('You are already registered! Please use `;register update`.');
                }
                break;
            case 'update':
                if (!exists) {
                    return message.channel.send('You have not registered yet.');
                } else {
                    let ally = await client.allyCodes.findOne({where: {id: userID}});
                    ally = ally.dataValues.allyCode;
                    await message.channel.send(message.language.get('COMMAND_REGISTER_PLEASE_WAIT')).then(async msg => {
                        await client.swgohAPI.updatePlayer(ally).then(async (u) => {
                            if (!u) {
                                await msg.edit(message.language.get('COMMAND_REGISTER_UPDATE_FAILURE'));
                            } else {
                                await msg.edit(message.language.get('COMMAND_REGISTER_UPDATE_SUCCESS', u.name));
                            }
                        });
                    });
                }
                break;
            case 'remove':
                if (!exists) {
                    message.channel.send('You were not linked to a SWGoH account.');
                } else {
                    await client.allyCodes.destroy({where: {id: userID}})
                        .then(() => {
                            message.channel.send('Successfully unlinked.');
                        })
                        .catch(() => {
                            message.channel.send('Something went wrong, please try again.');
                        });
                }
                break;
            default:
                client.helpOut(message, this);

        }
    }
}

module.exports = Register;

