import 'dotenv/config'
import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";

const signer = new NDKPrivateKeySigner(process.env.privkey)
const ndk = new NDK({ signer: signer, explicitRelayUrls: ["wss://nostr.mutinywallet.com"]});
await ndk.connect(1000)

setInterval(async () => {
    try {
        const req = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&limit=1&user=${process.env.lastfmuser}&api_key=${process.env.lastfmapikey}&format=json`)
        const res = await req.json();
        const mostRecent = res.recenttracks.track[0]
        const songEv = new NDKEvent(ndk)
        songEv.kind = 30315;
        // get current time, add 30 seconds, and convert it to UNIX timestamp
        const expiration = Math.floor((new Date().getTime() + 60000) / 1000)
        songEv.tags = [
            ['d', 'music'],
            ['expiration', `${expiration}`]
        ]
        if (mostRecent['@attr'].nowplaying !== 'true') {
            console.log('not playing')
            songEv.content = "";
            await songEv.publish()
            return
        }
        console.log(`playing ${mostRecent.name} - ${mostRecent.artist['#text']}`)
        songEv.tags.push(['r', 'spotify:search:' + encodeURIComponent(`${mostRecent.name} ${mostRecent.artist['#text']}`)])
        songEv.content = `${mostRecent.name} - ${mostRecent.artist['#text']}`

        await songEv.publish()
    } catch (e) {
        console.error(e)
    }
}, 30000)
