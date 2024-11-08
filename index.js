import discord
from discord.ext import commands
from datetime import timedelta
import re
import time  # Import time to track uptime

intents = discord.Intents.default()
intents.message_content = True
intents.moderation = True
intents.messages = True  # Ensure that the bot can read message history
bot = commands.Bot(command_prefix="!", intents=intents)

TOKEN = "MTMwMDY0OTI0MTc0NzkxODkyOA.GvBAR8.SVrlliUV-x69Y1Vf4t6eaCuZ-2vbXOjE7tyMgc"  # Replace with your actual bot token
LOG_CHANNEL_NAME = "bot-logs"  # Name of the channel where logs will be sent
start_time = time.time()  # Start time for uptime tracking

# Custom check to restrict command usage to specific roles
def is_owner_or_co_owner():
    async def predicate(ctx):
        return any(role.name in ["Owner", "co owner"] for role in ctx.author.roles)
    return commands.check(predicate)

@bot.event
async def on_ready():
    print(f"Bot connected as {bot.user}")

    channel = discord.utils.get(bot.get_all_channels(), name="commands")
    if channel:
        await channel.send("The bot has successfully started and is online! 🎉")
    else:
        print("Channel 'commands' not found.")

async def log_action(action):
    log_channel = discord.utils.get(bot.get_all_channels(), name=LOG_CHANNEL_NAME)
    if log_channel:
        await log_channel.send(action)

def parse_timeout_duration(duration_str):
    total_seconds = 0
    matches = re.findall(r'(\d+)([hms])', duration_str)

    for value, unit in matches:
        if unit == 'h':
            total_seconds += int(value) * 3600  # Convert hours to seconds
        elif unit == 'm':
            total_seconds += int(value) * 60  # Convert minutes to seconds
        elif unit == 's':
            total_seconds += int(value)  # Seconds remain as is

    return total_seconds

@bot.command()
@is_owner_or_co_owner()
async def kick(ctx, member: discord.Member, *, reason="No reason provided"):
    await member.kick(reason=reason)
    await ctx.send(f"{member} has been kicked for: {reason}")
    await log_action(f"{ctx.author} kicked {member} for: {reason}")

@bot.command()
@is_owner_or_co_owner()
async def ban(ctx, member: discord.Member, *, reason="No reason provided"):
    await member.ban(reason=reason)
    await ctx.send(f"{member} has been banned for: {reason}")
    await log_action(f"{ctx.author} banned {member} for: {reason}")

@bot.command()
@is_owner_or_co_owner()
async def unban(ctx, user_id: int):
    user = await bot.fetch_user(user_id)
    await ctx.guild.unban(user)
    await ctx.send(f"{user} has been unbanned.")
    await log_action(f"{ctx.author} unbanned {user}.")

@bot.command()
@is_owner_or_co_owner()
async def timeout(ctx, member: discord.Member, duration: str, *, reason="No reason provided"):
    total_seconds = parse_timeout_duration(duration)
    if total_seconds <= 0:
        await ctx.send("Please provide a valid duration (e.g., '1h', '30m', '15s', '1h30m').")
        return

    duration_timedelta = timedelta(seconds=total_seconds)
    await member.timeout_for(duration_timedelta, reason=reason)
    await ctx.send(f"{member} has been timed out for {duration} for: {reason}")
    await log_action(f"{ctx.author} timed out {member} for {duration} for: {reason}")

@bot.command()
@is_owner_or_co_owner()
async def untimeout(ctx, member: discord.Member):
    await member.remove_timeout()
    await ctx.send(f"{member} is no longer timed out.")
    await log_action(f"{ctx.author} removed timeout from {member}.")

@bot.command()
@is_owner_or_co_owner()
async def mute(ctx, member: discord.Member):
    mute_role = discord.utils.get(ctx.guild.roles, name="Muted")
    if not mute_role:
        mute_role = await ctx.guild.create_role(name="Muted")
        for channel in ctx.guild.channels:
            await channel.set_permissions(mute_role, send_messages=False, speak=False)
    await member.add_roles(mute_role)
    await ctx.send(f"{member} has been muted indefinitely.")
    await log_action(f"{ctx.author} muted {member}.")

@bot.command()
@is_owner_or_co_owner()
async def unmute(ctx, member: discord.Member):
    mute_role = discord.utils.get(ctx.guild.roles, name="Muted")
    if mute_role in member.roles:
        await member.remove_roles(mute_role)
        await ctx.send(f"{member} has been unmuted.")
        await log_action(f"{ctx.author} unmuted {member}.")

@bot.command()
@is_owner_or_co_owner()
async def warn(ctx, member: discord.Member, *, reason="No reason provided"):
    await ctx.send(f"{member} has been warned for: {reason}")
    await log_action(f"{ctx.author} warned {member} for: {reason}")

@bot.command()
@is_owner_or_co_owner()
async def softban(ctx, member: discord.Member, *, reason="No reason provided"):
    await member.ban(reason=reason)
    await ctx.guild.unban(member)
    await ctx.send(f"{member} has been soft banned for: {reason}")
    await log_action(f"{ctx.author} soft banned {member} for: {reason}")

@bot.command()
@is_owner_or_co_owner()
async def purge(ctx, amount: int):
    """Deletes a specified number of messages in the channel."""
    if amount < 1:
        await ctx.send("You need to delete at least one message.")
        return
    deleted = await ctx.channel.purge(limit=amount)
    await ctx.send(f"Deleted {len(deleted)} message(s).", delete_after=5)

@bot.command()
@is_owner_or_co_owner()
async def slowmode(ctx, seconds: int):
    if seconds < 0:
        await ctx.send("Please provide a valid slowmode duration (0 or more seconds).")
        return
    await ctx.channel.edit(slowmode_delay=seconds)
    await ctx.send(f"Slowmode has been set to {seconds} seconds.")
    await log_action(f"{ctx.author} set slowmode to {seconds} seconds in {ctx.channel.name}.")

@bot.command()
@is_owner_or_co_owner()
async def lockdown(ctx):
    await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=False)
    await ctx.send("This channel is now in lockdown mode.")
    await log_action(f"{ctx.author} initiated lockdown in {ctx.channel.name}.")

@bot.command()
@is_owner_or_co_owner()
async def unlock(ctx):
    await ctx.channel.set_permissions(ctx.guild.default_role, send_messages=True)
    await ctx.send("This channel has been unlocked.")
    await log_action(f"{ctx.author} unlocked {ctx.channel.name}.")

@bot.command()
@is_owner_or_co_owner()
async def roleinfo(ctx, role: discord.Role):
    embed = discord.Embed(title=f"Role Info: {role.name}", color=role.color)
    embed.add_field(name="ID", value=role.id, inline=True)
    embed.add_field(name="Position", value=role.position, inline=True)
    embed.add_field(name="Members", value=len(role.members), inline=True)
    await ctx.send(embed=embed)

@bot.command()
async def userinfo(ctx, member: discord.Member = None):
    if member is None:
        member = ctx.author
    embed = discord.Embed(title=f"User Info for {member}", color=discord.Color.blue())
    embed.add_field(name="ID", value=member.id, inline=True)
    embed.add_field(name="Joined at", value=member.joined_at.strftime("%Y-%m-%d %H:%M:%S"), inline=True)
    embed.add_field(name="Roles", value=", ".join([role.name for role in member.roles if role.name != "@everyone"]), inline=True)
    await ctx.send(embed=embed)

@bot.command()
async def serverinfo(ctx):
    guild = ctx.guild
    embed = discord.Embed(title=f"Server Info: {guild.name}", color=discord.Color.green())
    embed.add_field(name="ID", value=guild.id, inline=True)
    embed.add_field(name="Preferred Locale", value=guild.preferred_locale, inline=True)
    embed.add_field(name="Member Count", value=guild.member_count, inline=True)
    embed.add_field(name="Created At", value=guild.created_at.strftime("%Y-%m-%d %H:%M:%S"), inline=True)
    await ctx.send(embed=embed)

@bot.command(name="customhelp")  # Changed to avoid conflict
@is_owner_or_co_owner()
async def custom_help(ctx):
    """Displays a list of all moderation commands."""
    commands_list = [
        "!kick <member> [reason]: Kicks a member from the server.",
        "!ban <member> [reason]: Bans a member from the server.",
        "!unban <user_id>: Unbans a user using their ID.",
        "!timeout <member> <duration> [reason]: Times out a member for a specified duration.",
        "!untimeout <member>: Removes the timeout from a member.",
        "!mute <member>: Mutes a member indefinitely.",
        "!unmute <member>: Unmutes a member.",
        "!warn <member> [reason]: Issues a warning to a member.",
        "!softban <member> [reason]: Soft bans a member (bans and unbans them).",
        "!purge <amount>: Deletes a specified number of messages in the channel.",
        "!slowmode <seconds>: Sets the slow mode in the current channel.",
        "!lockdown: Locks the current channel, preventing members from sending messages.",
        "!unlock: Unlocks the current channel, allowing members to send messages again.",
        "!roleinfo <role>: Displays information about a specific role.",
        "!userinfo [member]: Displays information about a specified user.",
        "!serverinfo: Displays information about the server.",
        "!notify <member> [message]: Sends a direct message to a specified member.",
        "!botinfo: Displays information about the bot.",
        "!uptime: Displays how long the bot has been online.",
        "!say <message>: Sends a message as the bot."
    ]

    embed = discord.Embed(title="Moderation Commands", color=discord.Color.blue())
    embed.description = "List of moderation commands:"
    for command in commands_list:
        embed.add_field(name="\u200b", value=command, inline=False)  # \u200b is a zero-width space for better formatting

    await ctx.send(embed=embed)

@bot.command()
async def notify(ctx, member: discord.Member, *, message):
    await member.send(message)
    await ctx.send(f"Message sent to {member}.")

@bot.command()
async def botinfo(ctx):
    embed = discord.Embed(title="Bot Information", color=discord.Color.green())
    embed.add_field(name="Name", value=bot.user.name, inline=True)
    embed.add_field(name="ID", value=bot.user.id, inline=True)
    embed.add_field(name="Uptime", value=str(timedelta(seconds=int(time.time() - start_time))), inline=True)
    await ctx.send(embed=embed)

@bot.command()
async def uptime(ctx):
    uptime_duration = str(timedelta(seconds=int(time.time() - start_time)))
    await ctx.send(f"The bot has been online for: {uptime_duration}")

@bot.command()
async def say(ctx, *, message):
    await ctx.send(message)

bot.run(TOKEN)
