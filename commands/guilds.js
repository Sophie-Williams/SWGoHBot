const Command = require('../base/Command');
const mysql = require('mysql');

class Guilds extends Command {
    constructor(client) {
        super(client, {
            name: 'guilds',
            category: "SWGoH",
            aliases: ['guild']
        });
    }

    async run(client, message, [user, ...args], level) { // eslint-disable-line no-unused-vars
        // basic, with no args, shows the top ## guilds (Based on how many have registered)
        // <allyCode | mention | guildName >
        
        // Shows your guild's total GP, average GP, and a list of your members
        const connection = mysql.createConnection({
            host     : client.config.mySqlDB.host,
            user     : client.config.mySqlDB.user,
            password : client.config.mySqlDB.password,
            database : client.config.mySqlDB.database
        });

        // Not trying to get any specific guild, show em the top ones
        if (!user) {
            const guilds = [];
            await connection.query('CALL getAllGuilds();', function(err, results) {
                results[0].forEach((row, ix) => {
                    if (ix < 20) {
                        guilds.push(`\`[${row.count > 9 ? row.count : '0' + row.count}] ${' '.repeat(10 - row.gp.toString().length) + row.gp.toLocaleString()} GP\` - **${row.guildName}**`);
                    }
                });
                
                const desc = guilds.join('\n');
                message.channel.send({embed: {
                    author: {
                        name: `Top ${Object.keys(guilds).length}/${results[0].length} Guilds`
                    },
                    description: desc,
                    fields: [
                        {
                            name: 'For more info on a specific guilds:',
                            value: '```;guilds <mention|allyCode|guildName>```'
                        }
                    ]
                }});
            });
        } else {    // Else they want a specific guild
            let type = 'userID';
            let min = false;
            // Get the user's ally code from the message or psql db
            if (user === "me") {
                user = message.author.id;
            } else if (user.match(/\d{17,18}/)) {
                user = user.replace(/[^\d]*/g, '');
            } else if (user.match(/\d{9}/)) {
                user = user.replace(/[^\d]*/g, '');
                type = 'allyCode';
            } else {
                // Or, if they don't have one of those, try getting the guild by name
                user = user + ' ' + args.join(' ');
                type = 'gName';
            }
            const tUser = user.split(' ');
            if (tUser.includes('-min')) {
                min = true;
                tUser.splice(tUser.indexOf('-min'), 1);
                user = tUser;
                console.log(user);
            }

            let totalGP = 0;
            let averageGP = 0;
            if (type === 'userID' || type === 'allyCode') {
                let ally;
                if (type === 'userID') {
                    ally = await client.allyCodes.findOne({where: {id: user}});
                    ally = ally.dataValues.allyCode;
                } else {
                    ally = user;
                }
                const users = [];
                await connection.query('CALL getGuildByAllyCode( ? );', [ally], function(err, results) {
                    let guildName;
                    results[0].forEach((row) => {
                        totalGP += parseInt(row.TotalGP);
                        guildName = row.Guild;
                        users.push(`\`[${' '.repeat(9 - row.TotalGP.toLocaleString().length) + row.TotalGP.toLocaleString()} GP]\` - **${row.Name}**`);
                    });
                    averageGP = Math.floor(totalGP / results[0].length).toLocaleString();
                    const desc = users.join('\n');
                    message.channel.send({embed: {
                        author: {
                            name: `${results[0].length} Players in ${guildName}`
                        },
                        description: min ? '' : desc,
                        fields: [
                            {
                                name: 'Registered Guild GP',
                                value: '```Total GP: ' + totalGP.toLocaleString() + '\nAverage : ' + averageGP.toLocaleString() + '```' 
                            }
                        ]
                    }});
                });
            } else {
                const users = [];
                await connection.query("CALL getGuildByName( ? );", [user], function(err, results) {
                    let guildName;
                    results[0].forEach((row) => {
                        totalGP += parseInt(row.TotalGP);
                        guildName = row.Guild;
                        users.push(`\`[${' '.repeat(9 - row.TotalGP.toLocaleString().length) + row.TotalGP.toLocaleString()} GP]\` - **${row.pName}**`);
                    });
                    averageGP = totalGP / results[0].length;
                    const desc = users.join('\n');
                    message.channel.send({embed: {
                        author: {
                            name: `${results[0].length} Players in ${guildName}`
                        },
                        description: min ? '' : desc,
                        fields: [
                            {
                                name: 'Registered Guild GP',
                                value: '```Total GP: ' + totalGP.toLocaleString() + '\nAverage : ' + averageGP.toLocaleString() + '```' 
                            }
                        ]
                    }});
                });
            }
        }
        connection.end();
    }
}

module.exports = Guilds;

