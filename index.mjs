import 'dotenv/config'
import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";

const privkey = process.env.NOSTR_PRIVKEY
const lastfmuser = process.env.LASTFM_USER
const lastfmapikey = process.env.LASTFM_APIKEY

if (!privkey) throw new Error("expected NOSTR_PRIVKEY env")
if (!lastfmuser) throw new Error("expected LASTFM_USER env")
if (!lastfmapikey) throw new Error("expected LASTFM_APIKEY env")

const signer = new NDKPrivateKeySigner(process.env.NOSTR_PRIVKEY)
const ndk = new NDK({ signer: signer, explicitRelayUrls: ["wss://nostr.mutinywallet.com", "wss://relay.damus.io", "wss://relay.nostr.band", "wss://eden.nostr.land"]});
await ndk.connect(1000)

let lastPlaying = "";
setInterval(async () => {
    try {
        const req = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&limit=1&user=${process.env.LASTFM_USER}&api_key=${process.env.LASTFM_APIKEY}&format=json`)
        const res = await req.json();
        const mostRecent = res.recenttracks.track[0]
        if (mostRecent['@attr'] && mostRecent['@attr'].nowplaying !== 'true') {
            console.log('not playing')
            return
        }

        const content = `${mostRecent.name} - ${mostRecent.artist['#text']}`

        if (lastPlaying === content) {
            console.log(`still playing '${content}'`)
            return
        }
        lastPlaying = content

        const songEv = new NDKEvent(ndk)
        songEv.kind = 30315;
        // get current time, add 30 seconds, and convert it to UNIX timestamp
        const expiration = Math.floor((new Date().getTime() + (60000*5)) / 1000)
        songEv.tags = [
            ['d', 'music'],
            ['expiration', `${expiration}`],
            ['r', 'spotify:search:' + encodeURIComponent(`${mostRecent.name} ${mostRecent.artist['#text']}`)]
        ]
        songEv.content = content
        console.log(`sending ${content}`)
        console.log(songEv)

        await songEv.publish()
    } catch (e) {
        console.error(e)
    }
}, 30000)
