import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, Alert, Modal, TextInput, Linking, AppState, Image, Platform, ActionSheetIOS, Share,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { VideoView, useVideoPlayer } from 'expo-video';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { requireOptionalNativeModule } from 'expo-modules-core';


const captureFilters = requireOptionalNativeModule('JnoteCaptureFilters');

const EARNINGS_POINTS_PER_DOLLAR = 9000;
const MINIMUM_WITHDRAWAL_USD = 10;
const MINIMUM_WITHDRAWAL_POINTS = MINIMUM_WITHDRAWAL_USD * EARNINGS_POINTS_PER_DOLLAR;

// The wallet has no verified earnings balance until the payout backend is connected.
const verifiedEarningsPoints = 0;

const giftData = [
  ['🍿', 'Popcorn', 5],
  ['🎉', 'Party Hat', 20],
  ['🎩', 'Fancy Hat', 75],
  ['🕶️', 'Sunglasses', 100],
  ['👨', 'Mustache', 125],
  ['💄', 'Makeup', 150],
  ['👜', 'Ladies Bag', 300],
  ['🛍️', 'Designer Bag', 1500],
  ['👠', 'Ladies Shoes', 400],
  ['👞', 'Mens Shoes', 400],
  ['🎸', 'Bass Guitar', 1000],
  ['🌹', 'Red Rose', 10],
  ['💐', 'Flowers', 100],
  ['❤️', 'Heart', 15],
  ['🧸', 'Teddy Bear', 250],
  ['🎂', 'Birthday Cake', 500],
  ['🎈', 'Balloons', 60],
  ['☕', 'Coffee', 30],
  ['🍫', 'Chocolate', 40],
  ['💎', 'Diamond', 2000],
  ['💍', 'Diamond Ring', 4000],
  ['💍', 'Wedding Ring', 3000],
  ['💍', 'Engagement Ring', 6000],
  ['💝', 'Love Box', 800],
  ['🚗', 'Car', 10000],
  ['🏍️', 'Motorcycle', 5000],
  ['🦁', 'Lion', 12500],
  ['🐬', 'Dolphin', 11000],
  ['🎸', 'Golden Bass Guitar VIP', 22500],
  ['🌟', 'Super Star', 200],
  ['👑', 'Royal Crown', 7500],
  ['🎤', 'Microphone', 600],
  ['🎹', 'Keyboard', 1800],
  ['🥁', 'Drum Set', 2200],
  ['🎷', 'Saxophone', 2500],
  ['🎺', 'Trumpet', 1200],
  ['🎶', 'Music Notes', 25],
  ['🎵', 'Golden Music Note', 350],
  ['🚀', 'Rocket', 12000],
  ['✈️', 'Private Jet', 14000],
  ['🚢', 'Luxury Yacht', 16000],
  ['🏰', 'Royal Castle', 18000],
  ['🌈', 'Rainbow', 450],
  ['🦋', 'Butterfly', 125],
  ['🕊️', 'White Dove', 175],
  ['🎆', 'Fireworks', 1600],
  ['🏆', 'Trophy', 3500],
  ['🌍', 'World', 20000],
];

const gifts = giftData.map(([emoji, name, price]) => ({
  emoji, name, price,
}));

const faceGiftEffects = {
  'Fancy Hat': { symbol: '🎩', top: '6%', size: 118 },
  Sunglasses: { symbol: '🕶️', top: '24%', size: 150 },
  Mustache: { symbol: '〰', top: '42%', size: 110 },
};

const FACE_GIFT_DURATION = 5000;

const luckyGifts = [
  ['🍀', 'Lucky Clover', 25],
  ['🎵', 'Lucky Note', 50],
  ['🌹', 'Lucky Rose', 75],
  ['⭐', 'Lucky Star', 100],
  ['🎁', 'Lucky Box', 150],
  ['🎤', 'Lucky Mic', 200],
  ['💎', 'Lucky Diamond', 300],
  ['🎸', 'Lucky Bass', 500],
  ['👑', 'Lucky Crown', 750],
  ['🦁', 'Lucky Cub', 1000],
];

const FREE_PLAY_COINS = 1000;
const ROOM_KICK_DURATION_MS = 25 * 60 * 1000;

const backgrounds = ['#20243A', '#173B49', '#39244A'];

const formatTime = value =>
  `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

function AppLogo() {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Jnote LIVE logo" style={styles.brand}>
      <View style={styles.brandIcon}>
        <Text allowFontScaling={false} style={styles.brandJ}>J</Text>
        <View style={styles.brandDot} />
      </View>
      <Text style={styles.brandName}>Jnote LIVE</Text>
    </View>
  );
}

function Button({ title, action, danger = false, disabled = false }) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={action}
      style={[
        styles.button,
        danger && styles.danger,
        disabled && { opacity: 0.45 },
      ]}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

function Header({ title, back }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={back}>
        <Text style={styles.back}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>{title}</Text>
    </View>
  );
}

function DurationPicker({ value, onChange, disabled }) {
  return (
    <View style={styles.choices}>
      {[3, 5].map(minutes => (
        <TouchableOpacity
          key={minutes}
          disabled={disabled}
          onPress={() => onChange(minutes)}
          style={[
            styles.choice,
            value === minutes && styles.selected,
          ]}>
          <Text style={styles.white}>{minutes} Min</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function TestPlayback({ uri, hadSound, close }) {
  const player = useVideoPlayer(uri, instance => {
    instance.loop = false;
    instance.muted = false;
    instance.volume = 1;
    instance.audioMixingMode = 'doNotMix';
  });

  const [playing, setPlaying] = useState(player.playing);
  const [status, setStatus] = useState(player.status);
  const [error, setError] = useState('');

  useEffect(() => {
    const playingSubscription = player.addListener(
      'playingChange',
      event => setPlaying(event.isPlaying)
    );

    const statusSubscription = player.addListener(
      'statusChange',
      event => {
        setStatus(event.status);
        setError(
          event.status === 'error'
            ? event.error?.message ||
              'Could not open this recording. Close and record another test.'
            : ''
        );
      }
    );

    const appSubscription = AppState.addEventListener(
      'change',
      state => {
        if (state !== 'active') player.pause();
      }
    );

    setStatus(player.status);

    return () => {
      playingSubscription.remove();
      statusSubscription.remove();
      appSubscription.remove();
    };
  }, [player]);

  const play = (restart = false) => {
    try {
      if (
        restart ||
        (player.duration > 0 &&
          player.currentTime >= player.duration - 0.1)
      ) {
        player.currentTime = 0;
      }

      player.muted = false;
      player.volume = 1;
      player.play();
    } catch (issue) {
      setError(issue.message || 'Playback could not start.');
    }
  };

  const closePlayer = () => {
    player.pause();
    close();
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={closePlayer}>
      <View style={styles.playbackPage}>
        <Header title="Test Recording" back={closePlayer} />

        <VideoView
          player={player}
          style={styles.playbackVideo}
          contentFit="contain"
          nativeControls
        />

        <Text style={styles.muted}>
          {hadSound
            ? 'Recorded with microphone audio. Turn up your phone’s media volume.'
            : 'The microphone was muted for this clip. Unmute and record another test to check your voice.'}
        </Text>

        {status === 'loading' && (
          <Text style={styles.white}>Loading recording…</Text>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Button
          title={playing ? 'Pause Playback' : '▶ Play Recording'}
          disabled={status !== 'readyToPlay'}
          action={() => playing ? player.pause() : play()}
        />

        <Button
          title="↻ Replay from Beginning"
          disabled={status !== 'readyToPlay'}
          action={() => play(true)}
        />

        <Button title="Close Playback" action={closePlayer} />

        <Text style={styles.muted}>
          To save this clip to your phone, close playback and tap Download Recording.
        </Text>
      </View>
    </Modal>
  );
}

const CAMERA_TINTS = [
  { name: 'Original', color: 'transparent' },
  { name: 'Warm', color: '#FF9C38' },
  { name: 'Cool', color: '#589FFF' },
  { name: 'Rose', color: '#FF75B0' },
  { name: 'Golden', color: '#FFD65A' },
  { name: 'Lavender', color: '#AB8FFF' },
];

const VIDEO_PROJECT = 'https://aoiczhhujtixsmxqxaar.supabase.co';
const VIDEO_KEY = 'sb_publishable__lMPN4ILsPb9f07IgmBvIQ_NCstISdk';
const VIDEO_BUCKET = 'jnote-short-videos';

async function videoRequest(path, options = {}, token) {
  const request = options.body instanceof File ? expoFetch : fetch;
  const response = await request(VIDEO_PROJECT + path, {
    ...options,
    headers: {
      apikey: VIDEO_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.msg || error.error_description || error.error || `Request failed (${response.status}).`);
  }
  return response;
}

// Media feed: public photos and videos, with authenticated likes.
const mediaPublicUrl = path => VIDEO_PROJECT + '/storage/v1/object/public/' +
  VIDEO_BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');

function ShortVideoPlayer({ video }) {
  const player = useVideoPlayer(mediaPublicUrl(video.object_path));
  return <VideoView player={player} nativeControls style={{ width: '100%', height: 360 }} />;
}

function ShortVideos({ back, recordedClip, broadcasts }) {
  const [posts, setPosts] = useState([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [clip, setClip] = useState(recordedClip);
  const [mediaType, setMediaType] = useState('video');
  const [pickedMime, setPickedMime] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploadPath, setUploadPath] = useState('');
  const [likedIds, setLikedIds] = useState([]);
  const [likeCounts, setLikeCounts] = useState({});
  const [followedUsers, setFollowedUsers] = useState([]);
  const [followerCounts, setFollowerCounts] = useState({});
  const [shareCounts, setShareCounts] = useState({});
  const post = posts[index];

  const run = async operation => {
    setBusy(true);
    setStatus('');
    try { await operation(); }
    catch (error) {
      const message = error.message || 'Please try again.';
      setStatus(message.includes('media_posts') && message.includes('schema cache')
        ? 'Database setup needed: create the media_posts, media_likes, media_follows and media_shares tables in Supabase SQL Editor using the included setup file. Then tap Refresh Feed.'
        : message);
    }
    finally { setBusy(false); }
  };

  const load = async () => {
    const response = await videoRequest('/rest/v1/media_posts?select=id,user_id,object_path,caption,media_type,created_at&order=created_at.desc&limit=50');
    const rows = await response.json();
    setPosts(rows);
    setIndex(0);
    if (rows.length) {
      const owners = [...new Set(rows.map(p => p.user_id).filter(Boolean))];
      if (owners.length) {
        const followsResponse = await videoRequest('/rest/v1/media_follows?select=follower_id,following_id&following_id=in.(' + owners.join(',') + ')');
        const follows = await followsResponse.json();
        const totals = {};
        follows.forEach(f => { totals[f.following_id] = (totals[f.following_id] || 0) + 1; });
        setFollowerCounts(totals);
        setFollowedUsers(session?.user?.id ? follows.filter(f => f.follower_id === session.user.id).map(f => f.following_id) : []);
      }
      const sharesResponse = await videoRequest('/rest/v1/media_shares?select=post_id&post_id=in.(' + rows.map(p => p.id).join(',') + ')');
      const shares = await sharesResponse.json();
      const shareTotals = {};
      shares.forEach(sh => { shareTotals[sh.post_id] = (shareTotals[sh.post_id] || 0) + 1; });
      setShareCounts(shareTotals);
      const ids = rows.map(p => p.id).join(',');
      const likesResponse = await videoRequest('/rest/v1/media_likes?select=post_id,user_id&post_id=in.(' + ids + ')');
      const likes = await likesResponse.json();
      const counts = {};
      likes.forEach(like => { counts[like.post_id] = (counts[like.post_id] || 0) + 1; });
      setLikeCounts(counts);
      setLikedIds(session?.user?.id ? likes.filter(l => l.user_id === session.user.id).map(l => l.post_id) : []);
    } else { setLikeCounts({}); setLikedIds([]); setFollowerCounts({}); setFollowedUsers([]); setShareCounts({}); }
  };

  useEffect(() => { run(load); }, []);
  useEffect(() => {
    if (session) run(load);
    else { setLikedIds([]); setFollowedUsers([]); }
  }, [session?.access_token]);

  const authenticate = signUp => run(async () => {
    const path = signUp ? '/auth/v1/signup' : '/auth/v1/token?grant_type=password';
    const response = await videoRequest(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await response.json();
    setPassword('');
    if (data.access_token) setSession(data);
    else setStatus('Check your email to confirm your account, then sign in.');
  });

  const chooseMedia = type => run(async () => {
    const picker = requireOptionalNativeModule('ExponentImagePicker');
    if (!picker?.launchImageLibraryAsync) {
      throw new Error('Photo Library is unavailable in this preview. Open it on your phone in Expo Go.');
    }

    const result = await picker.launchImageLibraryAsync({
      mediaTypes: [type === 'photo' ? 'images' : 'videos'],
      allowsEditing: false,
      quality: 1,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setClip(asset.uri);
    setMediaType(type);
    setPickedMime(asset.mimeType || null);
    setUploadPath('');
  });

  const postMedia = () => run(async () => {
    if (!session || !clip) return;
    const original = clip.split('?')[0].toLowerCase();
    const formats = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      heic: 'image/heic', heif: 'image/heif', gif: 'image/gif',
      webp: 'image/webp', mov: 'video/quicktime', mp4: 'video/mp4',
      m4v: 'video/x-m4v', webm: 'video/webm',
    };
    const sourceExtension = original.match(/\.([a-z0-9]+)$/)?.[1];
    const mimeExtension = Object.keys(formats).find(key => formats[key] === pickedMime);
    const extension = '.' + (mimeExtension || (formats[sourceExtension] && sourceExtension)
      || (mediaType === 'photo' ? 'jpg' : 'mp4'));
    const mime = pickedMime || formats[extension.slice(1)];
    const path = uploadPath || session.user.id + '/' + Date.now() + '-' +
      Math.random().toString(36).slice(2) + extension;
    if (!uploadPath) {
      await videoRequest('/storage/v1/object/' + VIDEO_BUCKET + '/' + path, {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: new File(clip),
      }, session.access_token);
      setUploadPath(path);
    }
    await videoRequest('/rest/v1/media_posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ object_path: path, caption: caption.trim(), media_type: mediaType, user_id: session.user.id }),
    }, session.access_token);
    setClip(null); setCaption(''); setUploadPath('');
    await load();
    setStatus('Your ' + (mediaType === 'photo' ? 'picture' : 'video') + ' is posted!');
  });

  const toggleLike = () => run(async () => {
    if (!session) { setStatus('Sign in to like pictures and videos.'); return; }
    if (!post) return;
    const liked = likedIds.includes(post.id);
    if (liked) {
      await videoRequest('/rest/v1/media_likes?post_id=eq.' + post.id + '&user_id=eq.' + session.user.id,
        { method: 'DELETE' }, session.access_token);
    } else {
      await videoRequest('/rest/v1/media_likes', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ post_id: post.id, user_id: session.user.id }),
      }, session.access_token);
    }
    setLikedIds(ids => liked ? ids.filter(id => id !== post.id) : [...ids, post.id]);
    setLikeCounts(counts => ({ ...counts, [post.id]: Math.max(0, (counts[post.id] || 0) + (liked ? -1 : 1)) }));
  });

  const toggleFollow = () => run(async () => {
    if (!session) { setStatus('Sign in to follow creators.'); return; }
    if (!post?.user_id) return;
    if (post.user_id === session.user.id) { setStatus('You cannot follow your own account.'); return; }
    const creatorId = post.user_id;
    const following = followedUsers.includes(creatorId);
    if (following) {
      await videoRequest('/rest/v1/media_follows?follower_id=eq.' + session.user.id + '&following_id=eq.' + creatorId,
        { method: 'DELETE' }, session.access_token);
    } else {
      await videoRequest('/rest/v1/media_follows', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ follower_id: session.user.id, following_id: creatorId }),
      }, session.access_token);
    }
    setFollowedUsers(ids => following ? ids.filter(id => id !== creatorId) : [...ids, creatorId]);
    setFollowerCounts(counts => ({ ...counts, [creatorId]: Math.max(0, (counts[creatorId] || 0) + (following ? -1 : 1)) }));
  });

  const sharePost = async () => {
    if (!post) return;
    try {
      const result = await Share.share({ message: 'Check out this Jnote LIVE ' +
        (post.media_type === 'photo' ? 'picture' : 'video') + '! ' + mediaPublicUrl(post.object_path),
        url: mediaPublicUrl(post.object_path) });
      if (result.action === Share.sharedAction && session?.access_token) {
        try {
          await videoRequest('/rest/v1/media_shares', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ post_id: post.id, user_id: session.user.id }),
          }, session.access_token);
          setShareCounts(counts => ({ ...counts, [post.id]: (counts[post.id] || 0) + 1 }));
        } catch (_) { /* Sharing still succeeded even if the optional count could not be recorded. */ }
      }
    } catch (error) { Alert.alert('Share Error', error.message || 'Could not share this post.'); }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Header title="Short Videos & Pictures" back={back} />
      <Button title="Refresh Feed" disabled={busy} action={() => run(load)} />
      {!!status && <Text accessibilityLiveRegion="polite" style={styles.white}>{status}</Text>}
      {post ? (
        <>
          {post.media_type === 'photo' ? (
            <Image source={{ uri: mediaPublicUrl(post.object_path) }} resizeMode="contain"
              style={{ width: '100%', height: 360, backgroundColor: '#20243A' }} />
          ) : <ShortVideoPlayer key={post.id} video={post} />}
          <LiveAvatar
            userId={post.user_id}
            name={broadcasts.find(creator => creator.hostId === post.user_id)?.name ||
              (post.user_id === session?.user?.id ? 'You' : 'Creator')}
            live={broadcasts.some(creator => creator.hostId === post.user_id)}
            small
          />
          <Text style={styles.white}>Creator · {post.user_id === session?.user?.id ? 'You' : (post.user_id || '').slice(0, 8)}</Text>
          <Text style={styles.muted}>{(followerCounts[post.user_id] || 0).toLocaleString()} Followers</Text>
          {!!post.caption && <Text style={styles.white}>{post.caption}</Text>}
          <Text style={styles.white}>❤️ {(likeCounts[post.id] || 0).toLocaleString()} Likes · ↗ {(shareCounts[post.id] || 0).toLocaleString()} Shares</Text>
          {/* Like, Share and Follow are shown together for every photo and video. */}
          <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 6, marginVertical: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Button title={likedIds.includes(post.id) ? '❤️ Liked' : '♡ Like'}
                disabled={busy} action={toggleLike} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Button title="↗ Share" disabled={busy} action={sharePost} />
            </View>
            <View style={{ flex: 1.3, minWidth: 0 }}>
              <Button title={post.user_id === session?.user?.id ? 'My Post' : followedUsers.includes(post.user_id) ? '✓ Following' : '+ Follow'}
                disabled={busy || post.user_id === session?.user?.id} action={toggleFollow} />
            </View>
          </View>
          <Button title="Previous" disabled={index === 0} action={() => setIndex(index - 1)} />
          <Button title="Next Post" disabled={index >= posts.length - 1} action={() => setIndex(index + 1)} />
        </>
      ) : !busy && <Text style={styles.muted}>No posts yet. Upload the first picture or video!</Text>}
      <Text style={styles.large}>Post a Picture or Video</Text>
      <Button title="Upload Picture" disabled={busy} action={() => chooseMedia('photo')} />
      <Button title="Upload Video" disabled={busy} action={() => chooseMedia('video')} />
      {!session ? (
        <>
          <Text style={styles.muted}>Sign in to post and like. Everyone can browse and share public posts.</Text>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa" value={email}
            onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#aaa" value={password}
            onChangeText={setPassword} secureTextEntry />
          <Button title="Sign In" disabled={busy || !email.trim() || !password} action={() => authenticate(false)} />
          <Button title="Create Account" disabled={busy || !email.trim() || !password} action={() => authenticate(true)} />
        </>
      ) : <Button title="Sign Out" disabled={busy} action={() => setSession(null)} />}
      {!!clip && (
        <>
          <Text style={styles.white}>{mediaType === 'photo' ? 'Picture' : 'Video'} selected · Posts are public</Text>
          {mediaType === 'photo' && <Image source={{ uri: clip }} resizeMode="contain"
            style={{ width: '100%', height: 220 }} />}
          <TextInput style={styles.input} placeholder="Caption (optional)" placeholderTextColor="#aaa"
            value={caption} onChangeText={setCaption} maxLength={150} />
          <Text style={styles.muted}>
            Only post media you created or have permission to share, including any music in a video.
            By posting, you confirm you have those rights and give Jnote LIVE permission to store
            and display this post publicly in the app.
          </Text>
          <Button title={busy ? 'Uploading…' : 'Agree & Post'} disabled={busy || !session} action={postMedia} />
        </>
      )}
    </ScrollView>
  );
}

async function liveRequest(session, body, signal) {
  const response = await videoRequest('/functions/v1/livekit-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }, session.access_token);
  return response.json();
}

function LiveAvatar({ name, live, small = false, userId, revision }) {
  const photo = userId ? VIDEO_PROJECT + '/storage/v1/object/public/jnote-profile-photos/' +
    encodeURIComponent(userId) + '/avatar' + (revision ? '?v=' + revision : '') : '';
  const [failedPhoto, setFailedPhoto] = useState('');
  return (
    <View accessibilityLabel={live ? name + ', live now' : name}
      accessible style={[styles.avatar, small && styles.liveAvatarSmall, live && styles.liveRing]}>
      {photo && failedPhoto !== photo ? <Image onError={() => setFailedPhoto(photo)} source={{ uri: photo }} style={{ width: '100%', height: '100%', borderRadius: 55 }} /> :
        <Text style={[styles.avatarText, small && styles.liveAvatarSmallText]}>{(name.trim()[0] || 'J').toUpperCase()}</Text>}
    </View>
  );
}

function LiveSignIn({ back, onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const signIn = async () => {
    setPending(true);
    setError('');
    try {
      const response = await videoRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      onSignIn(await response.json());
    } catch (issue) {
      setError(issue.message || 'Sign-in failed.');
    } finally {
      setPending(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Header title="Sign In to Jnote LIVE" back={back} />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email"
        placeholderTextColor="#aaa" autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password"
        placeholderTextColor="#aaa" secureTextEntry />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title={pending ? 'Signing In…' : 'Sign In'} disabled={pending || !email.trim() || !password}
        action={signIn} />
    </ScrollView>
  );
}

function LiveComments({ title, comments, practiceComment, onSend }) {
  const [draft, setDraft] = useState('');
  const feed = useRef(null);
  const body = draft.trim();

  const send = () => {
    if (!body) return;
    onSend(body);
    setDraft('');
  };

  return (
    <View accessibilityLabel={title} style={styles.liveComments}>
      <ScrollView
        ref={feed}
        style={styles.commentFeed}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => feed.current?.scrollToEnd({ animated: true })}>
        {practiceComment && <Text style={styles.commentText}>{practiceComment}</Text>}
        {!practiceComment && comments.length === 0 && (
          <Text style={styles.muted}>No comments yet.</Text>
        )}
        {comments.map(comment => (
          <Text key={comment.id} style={styles.commentText}>
            <Text style={styles.commentAuthor}>{comment.author}</Text>
            {'  '}{comment.body}
          </Text>
        ))}
      </ScrollView>
      <TextInput
        accessibilityLabel="Write a live comment"
        style={styles.input}
        placeholder="Write a comment…"
        placeholderTextColor="#B8BDCC"
        value={draft}
        onChangeText={setDraft}
        maxLength={250}
        returnKeyType="send"
        onSubmitEditing={send}
      />
      <Button title="Send Comment" disabled={!body} action={send} />
    </View>
  );
}

function PhoneCamera({
  liveComments,
  optionalVideo = false,
  showFaceGiftPreview = false,
  allowPhotos = false,
  onPostClip,
  allowRecording = true,
  videoEnabled = true,
  onVideoChange,
  username = 'bass__note',
  muted,
  onMutedChange,
}) {
  const camera = useRef(null);
  const recordingRef = useRef(false);
  const takingPhotoRef = useRef(false);
  const savingMediaRef = useRef(false);
  const mounted = useRef(true);

  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [exportingVideo, setExportingVideo] = useState(false);
  const [facing, setFacing] = useState('front');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cameraTint, setCameraTint] = useState(CAMERA_TINTS[0]);
  const [tintStrength, setTintStrength] = useState(0.18);
  const [active, setActive] = useState(
    AppState.currentState === 'active'
  );
  const [cameraError, setCameraError] = useState('');
  const [recordedUri, setRecordedUri] = useState('');
  const [recordedWithSound, setRecordedWithSound] = useState(true);
  const [playbackVisible, setPlaybackVisible] = useState(false);

  const [captureMode, setCaptureMode] = useState(allowPhotos ? 'picture' : 'video');
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [savingMedia, setSavingMedia] = useState(false);
  const showVideo = !optionalVideo || videoEnabled;
  const [faceGiftQueue, setFaceGiftQueue] = useState([]);
  const currentFaceGift = faceGiftQueue[0];
  const faceGiftVisible = showFaceGiftPreview && showVideo && ready && active && !playbackVisible;

  useEffect(() => {
    if (!faceGiftVisible) {
      if (currentFaceGift) setFaceGiftQueue([]);
      return;
    }
    if (!currentFaceGift) return;

    const timeout = setTimeout(() => {
      setFaceGiftQueue(queue => queue.slice(1));
    }, FACE_GIFT_DURATION);

    return () => clearTimeout(timeout);
  }, [currentFaceGift, faceGiftVisible]);

  const stopRecording = () => {
    if (!recordingRef.current) return;
    setStopping(true);

    try {
      camera.current?.stopRecording();
    } catch (error) {
      setStopping(false);
      Alert.alert(
        'Recording Error',
        error.message || 'Could not stop recording.'
      );
    }
  };

  useEffect(() => {
    mounted.current = true;

    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        if (recordingRef.current) {
          try {
            camera.current?.stopRecording();
          } catch (_) {}
        }
        setReady(false);
      }

      setActive(state === 'active');
    });

    return () => {
      mounted.current = false;

      if (recordingRef.current) {
        try {
          camera.current?.stopRecording();
        } catch (_) {}
      }

      subscription.remove();
    };
  }, []);

  const askPermissions = async () => {
    try {
      const cameraResult = cameraPermission?.granted
        ? cameraPermission
        : await requestCamera();

      const micResult = micPermission?.granted
        ? micPermission
        : await requestMic();

      if (!cameraResult.granted || !micResult.granted) {
        Alert.alert(
          'Access Needed',
          'Allow camera and microphone access to record video with sound.'
        );
      }
    } catch (error) {
      Alert.alert('Permission Error', error.message);
    }
  };

  const exportCapture = async (uri, tint, strength, kind) => {
    if (tint.name === 'Original' || !captureFilters) return uri;
    return kind === 'photo'
      ? captureFilters.exportPhoto(uri, tint.color, strength)
      : captureFilters.exportVideo(uri, tint.color, strength);
  };

  const canCaptureSelectedFilter = () => true;

  const notifyFilterNotSaved = () => {
    if (cameraTint.name !== 'Original' && !captureFilters) {
      Alert.alert(
        'Photo Captured — Filter Preview Only',
        'Your photo was taken, but Expo Go cannot save this color filter into the image. The saved photo is original. Install the Jnote LIVE iPhone build for filtered photos.'
      );
    }
  };

  const startRecording = async (duration = 60) => {
    if (
      !ready ||
      captureMode !== 'video' ||
      !camera.current ||
      recordingRef.current ||
      playbackVisible ||
      !active
    ) return;

    if (!canCaptureSelectedFilter()) return;
    recordingRef.current = true;
    setRecording(true);
    setStopping(false);

    const hadSound = !muted;

    try {
      const result = await camera.current.recordAsync({
        maxDuration: duration,
      });

      if (mounted.current && result?.uri) {
        setExportingVideo(true);
        const uri = await exportCapture(result.uri, cameraTint, tintStrength, 'video');
        if (!mounted.current) return;
        setRecordedUri(uri);
        setRecordedWithSound(hadSound);

        Alert.alert(
          'Test Recording Complete',
          cameraTint.name !== 'Original' && !captureFilters
            ? 'Video recorded without the preview filter. Install the Jnote LIVE iPhone build to save filtered recordings.'
            : 'Play your clip below or tap Download Recording to save it to your phone.'
        );
      }
    } catch (error) {
      if (mounted.current) {
        Alert.alert(
          'Recording Error',
          error.message || 'Unable to record video.'
        );
      }
    } finally {
      recordingRef.current = false;

      if (mounted.current) {
        setRecording(false);
        setStopping(false);
        setExportingVideo(false);
      }
    }
  };

  const toggleCaptureMode = () => {
    if (recordingRef.current || takingPhotoRef.current) return;
    setReady(false);
    setCameraError('');
    setCaptureMode(mode => mode === 'picture' ? 'video' : 'picture');
  };

  const takePhoto = async () => {
    if (!ready || !active || !showVideo || takingPhotoRef.current || !camera.current) return;

    if (!canCaptureSelectedFilter()) return;
    takingPhotoRef.current = true;
    setTakingPhoto(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      if (mounted.current && photo?.uri) {
        const uri = await exportCapture(photo.uri, cameraTint, tintStrength, 'photo');
        if (mounted.current) {
          setPhotoUri(uri);
          notifyFilterNotSaved();
        }
      }
    } catch (error) {
      if (mounted.current) {
        Alert.alert('Photo Error', error.message || 'Could not take the photo.');
      }
    } finally {
      takingPhotoRef.current = false;
      if (mounted.current) setTakingPhoto(false);
    }
  };

  const saveCapture = async uri => {
    if (!uri || savingMediaRef.current) return;
    if (Platform.OS !== 'ios') {
      Alert.alert('Download Unavailable', 'Saving captures from this preview is available on iPhone.');
      return;
    }

    savingMediaRef.current = true;
    setSavingMedia(true);
    try {
      await new Promise((resolve, reject) => {
        ActionSheetIOS.showShareActionSheetWithOptions({ url: uri }, reject, resolve);
      });
    } catch (error) {
      if (mounted.current) {
        Alert.alert('Could Not Open Download', error.message || 'Try downloading again.');
      }
    } finally {
      savingMediaRef.current = false;
      if (mounted.current) setSavingMedia(false);
    }
  };

  const changeVideo = enabled => {
    if (recordingRef.current || takingPhotoRef.current || enabled === videoEnabled) return;
    setReady(false);
    setCameraError('');
    onVideoChange?.(enabled);
  };

  const openPlayback = () => {
    if (!recordedUri || recordingRef.current || !active) return;
    setReady(false);
    setPlaybackVisible(true);
  };

  const closePlayback = () => {
    setReady(false);
    setPlaybackVisible(false);
  };

  const permissionsGranted =
    cameraPermission?.granted && micPermission?.granted;

  const blocked =
    (cameraPermission &&
      !cameraPermission.granted &&
      !cameraPermission.canAskAgain) ||
    (micPermission &&
      !micPermission.granted &&
      !micPermission.canAskAgain);

  return (
    <View style={styles.cameraSection}>
      {optionalVideo && (
        <View style={styles.row}>
          {[
            [true, '📹 Video On'],
            [false, '🎤 Audio Only'],
          ].map(([enabled, label]) => (
            <View key={label} style={styles.half}>
              <TouchableOpacity
                disabled={recording}
                accessibilityRole="button"
                accessibilityState={{
                  selected: videoEnabled === enabled,
                  disabled: recording,
                }}
                onPress={() => changeVideo(enabled)}
                style={[
                  styles.modeButton,
                  videoEnabled === enabled && styles.selected,
                  recording && { opacity: 0.45 },
                ]}>
                <Text style={styles.buttonText}>{label}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {!showVideo ? (
        <View style={[styles.audioCard, liveComments && { paddingBottom: 190 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(username.trim()[0] || 'B').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.large}>{username || 'Your Profile'}</Text>
          <Text style={styles.white}>Camera Off · Audio Only</Text>
          <Text style={styles.muted}>
            Your profile initial replaces your camera.
          </Text>
          {liveComments}
        </View>
      ) : !cameraPermission || !micPermission ? (
        <Text style={styles.muted}>Loading permissions…</Text>
      ) : !permissionsGranted ? (
        <View style={styles.panel}>
          <Text style={styles.large}>Camera & Microphone</Text>
          <Text style={styles.muted}>
            Allow access to see yourself and record video with sound.
          </Text>
          <Button
            title={blocked ? 'Open Settings' : 'Allow Camera & Microphone'}
            action={blocked ? () => Linking.openSettings() : askPermissions}
          />
        </View>
      ) : (
        <>
          {active && !playbackVisible ? (
            <View style={styles.cameraFrame}>
              <CameraView
                key={`${facing}-${captureMode}`}
                ref={camera}
                style={styles.cameraFill}
                facing={facing}
                mode={captureMode}
                mute={muted}
                onCameraReady={() => {
                  setReady(true);
                  setCameraError('');
                }}
                onMountError={error => {
                  setReady(false);
                  setCameraError(error.message || 'Camera could not start.');
                }}
              />
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, {
                  backgroundColor: cameraTint.color,
                  opacity: cameraTint.name === 'Original' ? 0 : tintStrength,
                }]}
              />
              {faceGiftVisible && currentFaceGift && (
                <View
                  pointerEvents="none"
                  style={[styles.faceGiftOverlay, { top: currentFaceGift.effect.top }]}
                >
                  <Text style={[styles.faceGiftSymbol, { fontSize: currentFaceGift.effect.size }]}>
                    {currentFaceGift.effect.symbol}
                  </Text>
                </View>
              )}
              {liveComments}
            </View>
          ) : (
            <View style={styles.cameraFrame}>
              <Text style={styles.white}>
                {playbackVisible
                  ? 'Watching test recording'
                  : 'Camera paused'}
              </Text>
            </View>
          )}

          {!!cameraError && (
            <Text style={styles.error}>{cameraError}</Text>
          )}

          <Text style={styles.muted}>
            {recording
              ? `● Recording ${muted ? 'without sound' : 'with microphone audio'}`
              : 'Local phone camera · Not broadcasting'}
          </Text>
        </>
      )}


      {allowPhotos && captureMode === 'picture' && showVideo && permissionsGranted && active && (
        <Button
          title={takingPhoto ? 'Preparing Photo…' : 'Take Photo'}
          disabled={!ready || takingPhoto}
          action={takePhoto}
        />
      )}

      {allowRecording && captureMode === 'video' && showVideo && permissionsGranted && (
        recording ? (
          <Button
            title={exportingVideo ? 'Preparing Video…' : stopping ? 'Finishing Recording…' : 'Stop Recording'}
            danger
            disabled={exportingVideo || stopping || !active}
            action={stopRecording}
          />
        ) : (
          (allowPhotos ? [15, 60] : [60]).map(duration => (
            <Button
              key={duration}
              title={allowPhotos ? `Record ${duration}-Second Video` : 'Record 60-Second Test'}
              disabled={!ready || !active || playbackVisible}
              action={() => startRecording(duration)}
            />
          ))
        )
      )}

      {allowPhotos && allowRecording && showVideo && permissionsGranted && active && !playbackVisible && (
        <Button
          title={captureMode === 'picture' ? 'Switch to Video' : 'Switch to Photo'}
          disabled={takingPhoto || recording}
          action={toggleCaptureMode}
        />
      )}

      {!!photoUri && (
        <Modal visible animationType="fade" onRequestClose={() => { if (!savingMediaRef.current) setPhotoUri(''); }}>
          <View style={styles.photoPreview}>
            <Text style={styles.large}>Photo Preview</Text>
            <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="contain" />
            <Button
              title={savingMedia ? 'Download Menu Open…' : 'Download Photo'}
              disabled={savingMedia}
              action={() => saveCapture(photoUri)}
            />
            <Button title="Close Photo" disabled={savingMedia} action={() => setPhotoUri('')} />
          </View>
        </Modal>
      )}

      {showVideo && permissionsGranted && active && !playbackVisible && (
        <View>
          <Button
            title={`Filters · ${cameraTint.name}`}
            disabled={recording || takingPhoto}
            action={() => setFiltersOpen(value => !value)}
          />
          {filtersOpen && (
            <View style={styles.tintPanel}>
              <Text style={styles.white}>Camera preview tints</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CAMERA_TINTS.map(tint => (
                  <TouchableOpacity
                    key={tint.name}
                    accessibilityRole="button"
                    accessibilityLabel={`${tint.name} camera tint`}
                    accessibilityState={{ selected: cameraTint.name === tint.name }}
                    disabled={recording || takingPhoto}
                    onPress={() => {
                      if (!recordingRef.current && !takingPhotoRef.current) setCameraTint(tint);
                    }}
                    style={[styles.tintChoice, cameraTint.name === tint.name && styles.tintSelected]}>
                    <View style={[styles.tintSwatch, { backgroundColor: tint.name === 'Original' ? '#333' : tint.color }]} />
                    <Text style={styles.white}>{tint.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {cameraTint.name !== 'Original' && (
                <View style={styles.row}>
                  {[['Light', 0.10], ['Medium', 0.18], ['Strong', 0.28]].map(([label, value]) => (
                    <TouchableOpacity
                      key={label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tintStrength === value }}
                      disabled={recording || takingPhoto}
                      onPress={() => {
                        if (!recordingRef.current && !takingPhotoRef.current) setTintStrength(value);
                      }}
                      style={[styles.tintChoice, tintStrength === value && styles.tintSelected]}>
                      <Text style={styles.white}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.muted}>{captureFilters ? 'The selected filter is applied to your saved capture.' : 'Filtered capture is available in the Jnote LIVE iPhone build.'}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.row}>
        {showVideo && (
          <View style={styles.half}>
            <Button
              title="Flip Camera"
              disabled={
                recording ||
                takingPhoto ||
                !permissionsGranted ||
                !active ||
                playbackVisible
              }
              action={() => {
                setReady(false);
                setFacing(value => value === 'front' ? 'back' : 'front');
              }}
            />
          </View>
        )}
        <View style={styles.half}>
          <Button
            title={muted ? 'Unmute Mic' : 'Mute Mic'}
            disabled={recording || playbackVisible}
            action={() => onMutedChange(value => !value)}
          />
        </View>
      </View>

      {faceGiftVisible && (
        <View>
          <Text style={styles.large}>Face Gift Preview</Text>
          <Text style={styles.muted}>Center your face in the camera to try these effects.</Text>
          {gifts.filter(gift => faceGiftEffects[gift.name]).map(gift => (
            <Button
              key={gift.name}
              title={`Try ${gift.name}`}
              action={() => setFaceGiftQueue(queue => [
                ...queue,
                { effect: faceGiftEffects[gift.name] },
              ])}
            />
          ))}
        </View>
      )}

      {!showVideo && (
        <Text style={styles.muted}>
          {muted ? 'Mic preference: muted.' : 'Mic preference: unmuted.'}
          {' '}Audio-only calls are not connected in this preview.
        </Text>
      )}

      {!!recordedUri && (
        <>
          {onPostClip && (
            <Button title="Post to Short Videos" disabled={recording || playbackVisible}
              action={() => onPostClip(recordedUri)} />
          )}
          <Button
            title="▶ Play Test Recording"
            disabled={recording || !active || playbackVisible}
            action={openPlayback}
          />
          <Button
            title={savingMedia ? 'Download Menu Open…' : 'Download Recording'}
            disabled={savingMedia || recording || playbackVisible}
            action={() => saveCapture(recordedUri)}
          />
          <Text style={styles.muted}>
            Choose Save Video or Save to Files in the iPhone download menu.
            {' '}{recordedWithSound
              ? 'Microphone was on.'
              : 'Microphone was muted.'}
          </Text>
        </>
      )}

      {optionalVideo && recording && (
        <Text style={styles.muted}>
          Stop recording before switching room mode.
        </Text>
      )}

      {playbackVisible && !!recordedUri && (
        <TestPlayback
          uri={recordedUri}
          hadSound={recordedWithSound}
          close={closePlayback}
        />
      )}
    </View>
  );
}

const STARTING_GIFT_PREVIEW_COINS = 25000;
const TOGETHER_ROOM_SEAT_COUNT = 16;
const togetherRoomSeatLabel = seatNumber =>
  seatNumber === 1 ? 'Host' : seatNumber <= 6 ? `VIP ${seatNumber}` : `Seat ${seatNumber}`;
const GIFT_LEVEL_MILESTONES = [
  [0, 0],
  [1, 5],
  [5, 75],
  [10, 500],
  [14, 3000],
  [15, 5000],
  [20, 50000],
  [29, 1500000],
  [31, 3000000],
  [100, 100000000],
];
const MAX_GIFT_LEVEL = GIFT_LEVEL_MILESTONES[GIFT_LEVEL_MILESTONES.length - 1][0];

const GIFT_LEVEL_TARGETS = Array.from({ length: MAX_GIFT_LEVEL + 1 }, (_, level) => {
  const milestoneIndex = GIFT_LEVEL_MILESTONES.findIndex(([milestone]) => milestone >= level);
  const [endLevel, endCoins] = GIFT_LEVEL_MILESTONES[milestoneIndex];
  if (level === endLevel) return endCoins;

  const [startLevel, startCoins] = GIFT_LEVEL_MILESTONES[milestoneIndex - 1];
  const fraction = (level - startLevel) / (endLevel - startLevel);
  // Early gaps grow in steps. From level 15, targets grow proportionally.
  const target = startLevel < 15
    ? startCoins + (endCoins - startCoins) * fraction
    : startCoins * (endCoins / startCoins) ** fraction;
  return Math.round(target);
});

const giftLevelTarget = level => GIFT_LEVEL_TARGETS[level];

function GiftSenderProgress({ coinsSpent }) {
  const nextLevelIndex = GIFT_LEVEL_TARGETS.findIndex(target => target > coinsSpent);
  const level = nextLevelIndex === -1 ? MAX_GIFT_LEVEL : nextLevelIndex - 1;
  const atMaxLevel = level === MAX_GIFT_LEVEL;
  const nextLevelCoins = giftLevelTarget(Math.min(level + 1, MAX_GIFT_LEVEL));
  const progressCoins = Math.min(coinsSpent, nextLevelCoins);

  const coinsRemaining = nextLevelCoins - progressCoins;
  const progress = progressCoins / nextLevelCoins * 100;
  const upcomingLevels = Array.from(
    { length: Math.min(3, MAX_GIFT_LEVEL - level) },
    (_, index) => level + index + 1
  );

  return (
    <View style={styles.giftLevelCard}>
      <Text style={styles.muted}>Gift Sender Level</Text>
      <Text style={styles.large}>★ Lv. {level}</Text>
      <Text style={styles.white}>{coinsSpent.toLocaleString()} coins sent in regular gifts</Text>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={atMaxLevel ? "Maximum gift sender level reached" : `Progress toward gift sender level ${level + 1}`}
        accessibilityValue={{ min: 0, max: nextLevelCoins, now: progressCoins }}
        style={styles.giftLevelTrack}>
        <View style={[styles.giftLevelFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.white} accessibilityLiveRegion="polite">
        {atMaxLevel
          ? `Maximum level reached · Lv. ${MAX_GIFT_LEVEL}`
          : `${coinsRemaining.toLocaleString()} coins left to reach Lv. ${level + 1}`}
      </Text>
      {!atMaxLevel && (
        <>
          <Text style={styles.muted}>Upcoming levels · Total coins spent</Text>
          {upcomingLevels.map(upcomingLevel => (
            <Text key={upcomingLevel} style={styles.white}>
              Lv. {upcomingLevel} · {giftLevelTarget(upcomingLevel).toLocaleString()} coins
            </Text>
          ))}
          {!upcomingLevels.includes(MAX_GIFT_LEVEL) && (
            <Text style={styles.muted}>
              Final milestone · Lv. {MAX_GIFT_LEVEL} at {giftLevelTarget(MAX_GIFT_LEVEL).toLocaleString()} coins
            </Text>
          )}
        </>
      )}
    </View>
  );
}

export default function App() {
  const [playCoins, setPlayCoins] = useState(FREE_PLAY_COINS);
  const [luckyResult, setLuckyResult] = useState('');
  const playBalance = useRef(FREE_PLAY_COINS);

  const sendLuckyGift = (name, cost) => {
    if (playBalance.current < cost) return;

    const won = Math.random() < 0.25 ? cost * 2 : 0;
    playBalance.current += won - cost;
    setPlayCoins(playBalance.current);
    setLuckyResult(
      won ? name + ' · You won ' + won.toLocaleString() + ' play coins!'
        : name + ' · No bonus this time.'
    );
  };

  const refillPlayCoins = () => {
    playBalance.current = FREE_PLAY_COINS;
    setPlayCoins(FREE_PLAY_COINS);
    setLuckyResult('');
  };

  const [page, setPage] = useState('Home');
  const [livePreviewRoom, setLivePreviewRoom] = useState(null);
  const isLivePreview = livePreviewRoom === page;
  const [liveComments, setLiveComments] = useState([]);
  const commentId = useRef(0);
  const [previous, setPrevious] = useState('Home');
  const [giftPreviewCoins, setGiftPreviewCoins] = useState(STARTING_GIFT_PREVIEW_COINS);
  const giftPreviewBalance = useRef(STARTING_GIFT_PREVIEW_COINS);
  const giftCoinsSpent = STARTING_GIFT_PREVIEW_COINS - giftPreviewCoins;
  const [giftConfirmation, setGiftConfirmation] = useState('');
  const viewingWalletGifts = previous === 'Wallet';
  const sendingFromRoom = previous === 'Solo Live' || previous === 'Together Room';

  const [roomGiftRecipient, setRoomGiftRecipient] = useState(1);
  const [choosingRoomGiftRecipient, setChoosingRoomGiftRecipient] = useState(false);
  const sendingFromTogetherRoom = previous === 'Together Room';
  const giftingAllRoomSeats = sendingFromTogetherRoom && roomGiftRecipient === 'all';
  const giftRecipientLabel = giftingAllRoomSeats ? 'all 16 seats'
    : sendingFromTogetherRoom ? togetherRoomSeatLabel(roomGiftRecipient) : 'the host';
  const giftPreviewCost = gift => gift.price * (giftingAllRoomSeats ? TOGETHER_ROOM_SEAT_COUNT : 1);

  const sendPreviewGift = gift => {
    const cost = giftPreviewCost(gift);
    Alert.alert(
      'Send Gift',
      `Send ${gift.name} to ${giftRecipientLabel} for ${cost.toLocaleString()} preview coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Gift',
          onPress: () => {
            if (giftPreviewBalance.current < cost) {
              Alert.alert('More Preview Coins Needed');
              return;
            }
            giftPreviewBalance.current -= cost;
            setGiftPreviewCoins(giftPreviewBalance.current);
            setGiftConfirmation(`${gift.emoji} ${gift.name} sent to ${giftRecipientLabel} in this preview.`);
          },
        },
      ]
    );
  };
  const [duration, setDuration] = useState(3);
  const [seconds, setSeconds] = useState(180);
  const [running, setRunning] = useState(false);
  const [scores, setScores] = useState([0, 0]);

  const [roomDuration, setRoomDuration] = useState(3);
  const [roomSeconds, setRoomSeconds] = useState(180);
  const [roomRunning, setRoomRunning] = useState(false);
  const [roomScores, setRoomScores] = useState([0, 0]);
  const [roomFinished, setRoomFinished] = useState(false);

  const [roomVideoEnabled, setRoomVideoEnabled] = useState(true);
  const [roomMuted, setRoomMuted] = useState(false);
  const [soloMuted, setSoloMuted] = useState(false);


  const [battleMuted, setBattleMuted] = useState(false);

  const [background, setBackground] = useState(0);
  const [seat, setSeat] = useState(null);
  const [practiceGuest, setPracticeGuest] = useState({ status: 'away', seat: null });

  useEffect(() => {
    if (practiceGuest.status !== 'kicked') return;
    const timer = setTimeout(() => {
      setPracticeGuest(guest => guest === practiceGuest
        ? { status: 'away', seat: null }
        : guest);
    }, Math.max(0, practiceGuest.until - Date.now()));
    return () => clearTimeout(timer);
  }, [practiceGuest]);

  const managePracticeGuest = () => {
    Alert.alert('Practice Guest', 'Choose a host action.', [
      ...(Platform.OS === 'ios' ? [{ text: 'Cancel', style: 'cancel' }] : []),
      ...(practiceGuest.seat === null ? [] : [{
        text: 'Remove from Seat',
        onPress: () => setPracticeGuest({ status: 'inRoom', seat: null }),
      }]),
      {
        text: 'Kick for 25 Minutes',
        style: 'destructive',
        onPress: () => setPracticeGuest({
          status: 'kicked', seat: null, until: Date.now() + ROOM_KICK_DURATION_MS,
        }),
      },
      {
        text: 'Block from Room',
        style: 'destructive',
        onPress: () => Alert.alert('Block Practice Guest?', 'They can return after you unblock them.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => setPracticeGuest({ status: 'blocked', seat: null }),
          },
        ]),
      },
    ], { cancelable: true });
  };

  const [username, setUsername] = useState('bass__note');
  const [bio, setBio] = useState('Welcome to my LIVE!');
  const [recordedClip, setRecordedClip] = useState(null);
  const [liveSession, setLiveSession] = useState(null);
  const [photoRevision, setPhotoRevision] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoPending = useRef(false);

  const chooseProfilePhoto = async () => {
    if (!liveSession) {
      setLiveDestination('Profile');
      setPage('Live Sign In');
      return;
    }
    if (photoPending.current) return;
    photoPending.current = true;
    setPhotoBusy(true);
    try {
      const picker = requireOptionalNativeModule('ExponentImagePicker');
      if (!picker?.launchImageLibraryAsync || Platform.OS === 'web') {
        throw new Error('Open Jnote LIVE on your phone to choose a photo.');
      }
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.uri) return;
      const extension = asset.uri.split('?')[0].split('.').pop()?.toLowerCase();
      const formats = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const mime = asset.mimeType || formats[extension];
      if (!Object.values(formats).includes(mime)) throw new Error('Choose a JPEG, PNG or WebP photo.');
      if (asset.fileSize > 5242880) throw new Error('Choose a photo under 5 MB.');
      const form = new FormData();
      form.append('cacheControl', '0');
      form.append('file', { uri: asset.uri, name: 'avatar.' + mime.split('/')[1], type: mime });
      await videoRequest('/storage/v1/object/jnote-profile-photos/' + liveSession.user.id + '/avatar', {
        method: 'POST', headers: { 'x-upsert': 'true' }, body: form,
      }, liveSession.access_token);
      setPhotoRevision(Date.now());
    } catch (error) {
      Alert.alert('Profile Photo', error.message || 'Could not save your photo.');
    } finally {
      photoPending.current = false;
      setPhotoBusy(false);
    }
  };

  const [liveDestination, setLiveDestination] = useState('Live Now');
  const [broadcasts, setBroadcasts] = useState([]);
  const [liveError, setLiveError] = useState('');
  const joiningLive = false;

  useEffect(() => {
    if (!liveSession || !['Home', 'Live Now', 'Profile', 'Solo Live', 'Videos'].includes(page)) return;
    const controller = new AbortController();
    let timeout;
    const refresh = async () => {
      try {
        const data = await liveRequest(liveSession, { role: 'list' }, controller.signal);
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.broadcasts)) throw new Error('Update the livekit-token function to enable Live Now.');
        setBroadcasts(data.broadcasts);
        setLiveError('');
      } catch (issue) {
        if (controller.signal.aborted) return;
        setBroadcasts([]);
        setLiveError(issue.message || 'Could not load live broadcasts.');
      }
      timeout = setTimeout(refresh, 10000);
    };
    refresh();
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [page, liveSession]);

  const openBroadcast = () => Alert.alert('Native Build Required', 'Use the native Jnote LIVE build for broadcasting.');

  const openShortVideos = (clip = null) => {
    setRecordedClip(clip);
    setPage('Videos');
  };

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || seconds !== 0) return;
    setRunning(false);
    setPage('Results');
  }, [running, seconds]);

  useEffect(() => {
    if (!roomRunning) return;
    const timer = setInterval(() => {
      setRoomSeconds(value => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [roomRunning]);

  useEffect(() => {
    if (!roomRunning || roomSeconds !== 0) return;
    setRoomRunning(false);
    setRoomFinished(true);
  }, [roomRunning, roomSeconds]);

  const sendLiveComment = body => {
    const comment = {
      id: ++commentId.current,
      author: username.trim() || 'Host',
      body,
    };
    setLiveComments(comments => [...comments.slice(-99), comment]);
  };

  const toggleLivePreview = () => {
    setLiveComments([]);
    setLivePreviewRoom(room => (room === page ? null : page));
  };

  const home = () => {
    setLiveComments([]);
    setLivePreviewRoom(null);
    setRunning(false);
    setRoomRunning(false);
    setPage('Home');
  };

  const resetBattle = () => {
    setScores([0, 0]);
    setSeconds(duration * 60);
    setRunning(false);
    setPage('Battle');
  };

  const resetRoomBattle = () => {
    setRoomRunning(false);
    setRoomFinished(false);
    setRoomSeconds(roomDuration * 60);
    setRoomScores([0, 0]);
  };

  const openGifts = () => {
    setGiftConfirmation('');
    setRoomGiftRecipient(1);
    setChoosingRoomGiftRecipient(false);
    setPrevious(page);
    setPage('Gifts');
  };

  const resultLabel = (values, index) => {
    if (values[0] === values[1]) return 'DRAW';
    const winner = values[0] > values[1] ? 0 : 1;
    return winner === index ? '🏆 WINNER!' : '😢 LOSER';
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />


      {page === 'Home' && (
        <ScrollView contentContainerStyle={styles.home}>
          <AppLogo />
          <Text style={styles.subtitle}>Go Live. Share Talent. Connect.</Text>
          <Button title="Live Now" action={() => {
            setLiveDestination('Live Now');
            setPage(liveSession ? 'Live Now' : 'Live Sign In');
          }} />
          {broadcasts.length > 0 && (
            <ScrollView horizontal style={styles.liveCreators} showsHorizontalScrollIndicator={false}>
              {broadcasts.map(creator => (
                <TouchableOpacity
                  key={creator.hostId}
                  accessibilityRole="button"
                  accessibilityLabel={creator.name + ', live now. Open Live Now'}
                  onPress={() => setPage('Live Now')}
                  style={styles.liveCreator}>
                  <LiveAvatar userId={creator.hostId} name={creator.name} live small />
                  <Text numberOfLines={1} style={styles.white}>{creator.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <Button title="Solo Live" action={() => setPage('Solo Live')} />
          <Button title="Battle" action={resetBattle} />
          <Button title="Together Room" action={() => setPage('Together Room')} />
          <Button title="Short Videos" action={() => openShortVideos()} />
          <Button title="My Profile" action={() => setPage('Profile')} />
          <Button title="🎁 Gifts" action={openGifts} />
          <Button title="My Wallet" action={() => setPage('Wallet')} />
        </ScrollView>
      )}

      {page === 'Live Sign In' && (
        <LiveSignIn back={home} onSignIn={session => { setLiveSession(session); setPage(liveDestination); }} />
      )}

      {page === 'Live Now' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Header title="Live Now" back={home} />
          {!!liveError && <Text style={styles.error}>{liveError}</Text>}
          {!liveError && broadcasts.length === 0 && <Text style={styles.muted}>No active broadcasts found.</Text>}
          {broadcasts.map(creator => (
            <View key={creator.hostId} style={styles.panel}>
              <LiveAvatar userId={creator.hostId} name={creator.name} live small />
              <Text style={styles.white}>{creator.name}</Text>
              <Text style={styles.white}>🔴 LIVE</Text>
              <Button title="Watch Live" disabled={joiningLive || creator.hostId === liveSession?.user?.id}
                action={() => openBroadcast(creator)} />
            </View>
          ))}
          <Button title="Sign Out" disabled={joiningLive} action={() => {
            setBroadcasts([]);
            setLiveError('');
            setLiveSession(null);
            home();
          }} />
        </ScrollView>
      )}

      {page === 'Solo Live' && (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <Header title="Solo Live" back={home} />
          <Button title={joiningLive ? 'Connecting…' : 'Go Live'}
            disabled={joiningLive} action={() => openBroadcast()} />
          <Button title="🎁 Send Gift" action={openGifts} />
          <PhoneCamera
            onPostClip={openShortVideos}
            allowPhotos
            showFaceGiftPreview
            muted={soloMuted}
            onMutedChange={setSoloMuted}
            username={username}
            liveComments={
              <LiveComments
                title="Solo Live Comments"
                comments={liveComments}
                onSend={sendLiveComment}
              />
            }
          />
          <Button title="Back to Home" action={home} />
        </ScrollView>
      )}

      {page === 'Battle' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Header title="Battle Practice" back={home} />
          <Text style={styles.large}>Your Camera</Text>
          <PhoneCamera muted={battleMuted} onMutedChange={setBattleMuted} />

          <Text style={styles.large}>Battle Duration</Text>
          <DurationPicker
            value={duration}
            disabled={running}
            onChange={minutes => {
              setDuration(minutes);
              setSeconds(minutes * 60);
              setScores([0, 0]);
            }}
          />
          <Text style={styles.timer}>{formatTime(seconds)}</Text>

          <View style={styles.battleRow}>
            {[0, 1].map(index => (
              <View key={index} style={styles.battleSeat}>
                <Text style={styles.white}>
                  {index === 0 ? 'You' : 'Player 2'}
                </Text>
                <Text style={styles.muted}>
                  {index === 0 ? 'Your preview is above' : 'Opponent not connected'}
                </Text>
                <Text style={styles.large}>{scores[index]} Points</Text>
              </View>
            ))}
          </View>

          <Button
            title={running ? 'Pause Battle' : 'Start Battle'}
            action={() => {
              if (seconds > 0) setRunning(value => !value);
            }}
          />
          <Button
            title="Finish Practice Battle"
            action={() => {
              setRunning(false);
              setPage('Results');
            }}
          />
          <Button title="Leave Battle" danger action={home} />
        </ScrollView>
      )}

      {page === 'Results' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Header title="Battle Results" back={home} />
          <Text style={styles.large}>BATTLE FINISHED!</Text>
          <View style={styles.battleRow}>
            {[0, 1].map(index => (
              <View key={index} style={styles.battleSeat}>
                <Text style={styles.white}>Player {index + 1}</Text>
                <Text style={styles.large}>{scores[index]} Points</Text>
                <Text style={styles.resultText}>
                  {resultLabel(scores, index)}
                </Text>
              </View>
            ))}
          </View>
          <Button title="Rematch" action={resetBattle} />
          <Button title="Back to Home" action={home} />
        </ScrollView>
      )}

      {page === 'Together Room' && (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <Header title="Together Room" back={home} />
          <Text style={styles.live}>
            {isLivePreview ? 'LOCAL PREVIEW ACTIVE' : 'ROOM PREVIEW'}
          </Text>
          <Button
            title={isLivePreview ? 'End Local Preview' : 'Start Local Preview'}
            action={toggleLivePreview}
            danger={isLivePreview}
          />
          <Button title="Send Gift" action={openGifts} />
          <Text style={styles.muted}>Live broadcasting with LiveKit requires a Jnote LIVE development build.</Text>
          <Text style={styles.large}>Your Room Mode</Text>
          <PhoneCamera
            optionalVideo
            onPostClip={openShortVideos}
            showFaceGiftPreview
            allowPhotos
            videoEnabled={roomVideoEnabled}
            onVideoChange={setRoomVideoEnabled}
            username={username}
            muted={roomMuted}
            onMutedChange={setRoomMuted}
            liveComments={isLivePreview && (
              <LiveComments
                title="Together Room Comments"
                comments={liveComments}
                practiceComment={practiceGuest.status === 'inRoom' && 'Practice Guest · Glad to be here!'}
                onSend={sendLiveComment}
              />
            )}
          />


          <Text style={styles.white}>Choose Background</Text>
          <View style={styles.choices}>
            {backgrounds.map((color, index) => (
              <TouchableOpacity
                key={color}
                onPress={() => setBackground(index)}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  background === index && styles.selected,
                ]}
              />
            ))}
          </View>

          <View style={[
            styles.room,
            { backgroundColor: backgrounds[background] },
          ]}>
            <Text style={styles.large}>Together Room — 16 Seats</Text>
            <Text style={styles.muted}>6 VIP · 10 Regular</Text>

            <View style={styles.seats}>
              {Array.from({ length: TOGETHER_ROOM_SEAT_COUNT }, (_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (practiceGuest.seat === index) {
                      managePracticeGuest();
                      return;
                    }
                    setSeat(seat === index ? null : index);
                  }}
                  style={[
                    styles.seat,
                    index < 6 && styles.vipSeat,
                    seat === index && styles.selected,
                  ]}>
                  <Text style={styles.seatText}>
                    {index === 0 ? 'HOST' : `${index < 6 ? '👑 VIP' : 'Seat'} ${index + 1}`}
                  </Text>
                  <Text style={styles.seatText}>
                    {seat === index
                      ? `${(username.trim()[0] || 'B').toUpperCase()} · You`
                      : practiceGuest.seat === index ? 'Practice Guest' : '○'}
                  </Text>
                  {seat === index && (
                    <Text style={styles.seatText}>
                      {roomVideoEnabled ? '📹 Video' : '🎤 Audio'}
                      {roomMuted ? ' · Muted' : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.muted}>
            Try host controls with a practice guest on this device.
          </Text>
          {practiceGuest.status === 'blocked' ? (
            <Button
              title="Unblock Practice Guest"
              action={() => setPracticeGuest({ status: 'away', seat: null })}
            />
          ) : practiceGuest.status === 'kicked' ? (
            <Text style={styles.muted}>
              Practice Guest can rejoin after {new Date(practiceGuest.until).toLocaleTimeString(
                undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' },
              )}.
            </Text>
          ) : (
            <>
              {practiceGuest.status === 'inRoom' && (
                <Button title="Manage Practice Guest" action={managePracticeGuest} />
              )}
              {practiceGuest.seat === null && (
                <Button
                  title={practiceGuest.status === 'away' ? 'Add Practice Guest' : 'Seat Practice Guest'}
                  action={() => setPracticeGuest({ status: 'inRoom', seat: seat === 1 ? 2 : 1 })}
                />
              )}
            </>
          )}
          <Text style={styles.large}>Host Battle Practice</Text>
          <Text style={styles.muted}>
            You are the host in this local preview.
          </Text>

          <DurationPicker
            value={roomDuration}
            disabled={roomRunning}
            onChange={minutes => {
              setRoomDuration(minutes);
              setRoomSeconds(minutes * 60);
              setRoomScores([0, 0]);
              setRoomFinished(false);
            }}
          />
          <Text style={styles.timer}>{formatTime(roomSeconds)}</Text>

          <View style={styles.battleRow}>
            {[0, 1].map(index => (
              <View key={index} style={styles.battleSeat}>
                <Text style={styles.white}>Team {index + 1}</Text>
                <Text style={styles.large}>{roomScores[index]} Points</Text>
                {roomFinished && (
                  <Text style={styles.resultText}>
                    {resultLabel(roomScores, index)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <Button
            title={roomRunning ? 'Pause Room Battle' : 'Start Room Battle'}
            action={() => {
              if (roomFinished || roomSeconds === 0) {
                Alert.alert('Battle Finished', 'Tap Reset Room Battle.');
                return;
              }
              setRoomRunning(value => !value);
            }}
          />
          <Button
            title="Finish Room Battle"
            action={() => {
              setRoomRunning(false);
              setRoomFinished(true);
            }}
          />
          <Button title="Reset Room Battle" action={resetRoomBattle} />
          <Button title="Leave Room" danger action={home} />
        </ScrollView>
      )}

      {page === 'Videos' && <ShortVideos back={home} recordedClip={recordedClip} broadcasts={broadcasts} />}

      {page === 'Profile' && (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <Header title="My Profile" back={home} />
          <LiveAvatar name={username} userId={liveSession?.user?.id} revision={photoRevision} live={broadcasts.some(creator => creator.hostId === liveSession?.user?.id)} />
          <Button title={photoBusy ? 'Saving Photo…' : liveSession ? 'Change Profile Photo' : 'Sign In to Add a Profile Photo'} disabled={photoBusy} action={chooseProfilePhoto} />
          <GiftSenderProgress coinsSpent={giftCoinsSpent} />
          <Text style={styles.muted}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Username"
            placeholderTextColor="#888"
          />

          <Text style={styles.muted}>Bio</Text>
          <TextInput
            style={styles.input}
            value={bio}
            onChangeText={setBio}
            placeholder="Your bio"
            placeholderTextColor="#888"
          />

          <View style={styles.row}>
            {[[0, 'Followers'], [0, 'Following'], [0, 'Posts']]
              .map(([value, label]) => (
                <View key={label} style={styles.stat}>
                  <Text style={styles.large}>{value}</Text>
                  <Text style={styles.muted}>{label}</Text>
                </View>
              ))}
          </View>

          <Button
            title="Save Profile (Preview)"
            action={() => Alert.alert(
              'Profile Updated',
              'Changes stay in this session only.'
            )}
          />
        </ScrollView>
      )}

      {page === 'Wallet' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Header title="My Wallet" back={home} />
          <GiftSenderProgress coinsSpent={giftCoinsSpent} />
          <Text style={styles.large}>{giftPreviewCoins.toLocaleString()} Preview Coins</Text>
          <Text style={styles.muted}>See gift prices in coins and estimated USD. Preview Coins are free. Real coin purchases are currently unavailable.</Text>
          <Button title="Buy Gift" action={openGifts} />
          <Text style={styles.large}>Gift Earnings</Text>
          <Text style={styles.white}>70% recipient · 30% Jnote LIVE</Text>
          <Text style={styles.white}>{EARNINGS_POINTS_PER_DOLLAR.toLocaleString('en-US')} Earnings Points = $1 USD</Text>
          <Text style={styles.large}>Available to withdraw</Text>
          <Text style={styles.white}>${(verifiedEarningsPoints / EARNINGS_POINTS_PER_DOLLAR).toFixed(2)} USD</Text>
          <Text style={styles.muted}>
            Minimum withdrawal is ${MINIMUM_WITHDRAWAL_USD.toFixed(2)} USD ({MINIMUM_WITHDRAWAL_POINTS.toLocaleString('en-US')} verified earnings points).
          </Text>
          <Text style={styles.muted}>Cash payouts are currently unavailable.</Text>
          <Button
            title="Withdraw Money"
            action={() => Alert.alert(
              'Withdraw Money',
              verifiedEarningsPoints < MINIMUM_WITHDRAWAL_POINTS
                ? `You need at least $${MINIMUM_WITHDRAWAL_USD.toFixed(2)} USD in verified gift earnings to withdraw.`
                : 'Cash payouts are currently unavailable.'
            )}
          />

        </ScrollView>
      )}

      {page === 'Gifts' && (
        <View style={styles.giftsPage}>
          <Header title={sendingFromRoom ? "Send Gift" : viewingWalletGifts ? "Buy Gift" : "Gifts"} back={() => setPage(previous)} />
          <ScrollView style={styles.giftScroll}>
            <GiftSenderProgress coinsSpent={giftCoinsSpent} />
            <Text style={styles.large}>1. Regular Gifts · {gifts.length}</Text>
            {sendingFromRoom ? (
              <>
                <Text style={styles.white}>
                  {giftPreviewCoins.toLocaleString()} Preview Coins
                </Text>
                {sendingFromTogetherRoom ? (
                  <>
                    <Text style={styles.white}>Gift recipient · {giftRecipientLabel}</Text>
                    <Button
                      title={choosingRoomGiftRecipient ? 'Close Recipients' : 'Choose Recipient'}
                      action={() => setChoosingRoomGiftRecipient(value => !value)}
                    />
                    {choosingRoomGiftRecipient && (
                      <>
                        <Button title="All 16 Seats" action={() => {
                          setRoomGiftRecipient('all');
                          setChoosingRoomGiftRecipient(false);
                        }} />
                        <View style={styles.seats}>
                          {Array.from({ length: TOGETHER_ROOM_SEAT_COUNT }, (_, index) => {
                            const seatNumber = index + 1;
                            return (
                              <TouchableOpacity
                                key={seatNumber}
                                accessibilityRole="button"
                                style={styles.seat}
                                onPress={() => {
                                  setRoomGiftRecipient(seatNumber);
                                  setChoosingRoomGiftRecipient(false);
                                }}>
                                <Text style={styles.seatText}>{togetherRoomSeatLabel(seatNumber)}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}
                    <Text style={styles.muted}>
                      Free preview · All 16 sends one gift per seat and costs 16 times the single gift price.
                    </Text>
                  </>
                ) : (
                  <Text style={styles.muted}>Free preview · Gifts go to the host on this device.</Text>
                )}
                {!!giftConfirmation && (
                  <Text accessibilityLiveRegion="polite" style={styles.white}>{giftConfirmation}</Text>
                )}
              </>
            ) : viewingWalletGifts ? (
              <>
                <Text style={styles.white}>{giftPreviewCoins.toLocaleString()} Preview Coins available</Text>
                <Text style={styles.muted}>Check prices here. To use Preview Coins, open Solo Live or Together Room and tap Send Gift.</Text>
              </>
            ) : (
              <Text style={styles.muted}>Open Solo Live or Together Room to try sending a gift.</Text>
            )}
            <View style={styles.giftGrid}>
              {gifts.map(gift => (
                <View key={gift.name} style={styles.gift}>
                  <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                  {faceGiftEffects[gift.name] && (
                    <Text style={styles.muted}>Camera effect</Text>
                  )}
                  <Text style={styles.giftPrice}>
                    {giftPreviewCost(gift).toLocaleString()} Coins
                  </Text>
                  <Text style={styles.muted}>
                    ${(gift.price / 100).toFixed(2)} estimated USD
                  </Text>
                  {sendingFromRoom && (
                    <Button
                      title="Send Gift"
                      disabled={giftPreviewCoins < gift.price}
                      action={() => sendPreviewGift(gift)}
                    />
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.large}>2. 🍀 Lucky Gifts</Text>
            <Text style={styles.white}>
              {playCoins.toLocaleString()} Play Coins
            </Text>
            <Text style={styles.muted}>
              Free play only · No cash value. Each send has a 25% chance
              of winning double the cost and a 75% chance of no bonus.
            </Text>
            {playCoins < FREE_PLAY_COINS && (
              <Button title="Refill to 1,000 Free Play Coins" action={refillPlayCoins} />
            )}
            <Text accessibilityLiveRegion="polite" style={styles.white}>
              {luckyResult}
            </Text>
            <View style={styles.giftGrid}>
              {luckyGifts.map(([emoji, name, cost]) => (
                <View key={name} style={styles.gift}>
                  <Text style={styles.giftEmoji}>{emoji}</Text>
                  <Text style={styles.giftName}>{name}</Text>
                  <Text style={styles.giftPrice}>
                    Top bonus · {(cost * 2).toLocaleString()} play coins
                  </Text>
                  <Button
                    title={'Send · ' + cost.toLocaleString()}
                    disabled={playCoins < cost}
                    action={() => sendLuckyGift(name, cost)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginBottom: 16 },
  brandIcon: {
    width: 112, height: 112, borderRadius: 26,
    backgroundColor: '#0800E8', alignItems: 'center', justifyContent: 'center',
  },
  brandJ: { color: '#FFFFFF', fontSize: 88, lineHeight: 104, fontWeight: 'bold' },
  brandDot: {
    position: 'absolute', top: 17, right: 17,
    width: 17, height: 17, borderRadius: 9, backgroundColor: '#FF1717',
  },
  brandName: {
    color: '#FFFFFF', fontSize: 30, fontWeight: 'bold',
    textAlign: 'center', marginTop: 10,
  },
  container: {
    flex: 1, backgroundColor: '#101020', paddingHorizontal: 18,
  },
  home: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingTop: 65, paddingBottom: 40,
  },
  content: {
    flexGrow: 1, paddingTop: 60, paddingBottom: 40,
    alignItems: 'center',
  },
  giftsPage: {
    flex: 1, paddingTop: 60, paddingBottom: 25,
    alignItems: 'center',
  },
  title: {
    color: 'white', fontSize: 30, fontWeight: 'bold',
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    color: 'white', fontSize: 15, marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2455D6', padding: 14, borderRadius: 14,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  modeButton: {
    backgroundColor: '#2455D6', paddingVertical: 14,
    paddingHorizontal: 6, borderRadius: 14, width: '100%',
    alignItems: 'center', borderWidth: 3, borderColor: 'transparent',
  },
  danger: { backgroundColor: '#C62828' },
  buttonText: {
    color: 'white', fontSize: 16, fontWeight: 'bold',
    textAlign: 'center',
  },
  header: { width: '100%', marginBottom: 18 },
  back: {
    color: '#80A8FF', fontSize: 18, paddingVertical: 8,
  },
  heading: {
    color: 'white', fontSize: 27, fontWeight: 'bold',
    textAlign: 'center',
  },
  white: {
    color: 'white', fontSize: 16, marginVertical: 7,
    textAlign: 'center',
  },
  muted: {
    color: '#B8BDCC', fontSize: 14,
    textAlign: 'center', marginVertical: 7,
  },
  error: {
    color: '#FF9999', textAlign: 'center', marginVertical: 10,
  },
  large: {
    color: 'white', fontSize: 20, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 12,
  },
  panel: {
    width: '100%', backgroundColor: '#20243A', padding: 20,
    borderRadius: 16, marginBottom: 18, alignItems: 'center',
  },
  live: {
    color: 'white', backgroundColor: '#C62828', padding: 8,
    borderRadius: 8, marginBottom: 12,
  },
  liveComments: {
    position: 'absolute', bottom: 0, left: 8, right: 8,
  },
  commentFeed: { maxHeight: 92, marginBottom: 5 },
  commentText: {
    color: '#FFFFFF', fontSize: 15, paddingVertical: 4,
    paddingHorizontal: 8, backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  commentAuthor: { color: '#A8C4FF', fontWeight: 'bold' },
  cameraSection: {
    width: '100%', marginBottom: 16,
  },
  cameraFrame: {
    width: '100%', height: 300, backgroundColor: '#20243A',
    borderRadius: 18, overflow: 'hidden', justifyContent: 'center',
  },
  cameraFill: { flex: 1 },
  photoPreview: {
    flex: 1, backgroundColor: '#12121F', padding: 24, paddingTop: 64,
  },
  photoImage: { flex: 1, width: '100%', marginVertical: 16 },
  faceGiftOverlay: {
    position: 'absolute', left: 0, right: 0, alignItems: 'center',
  },
  faceGiftSymbol: { color: '#171717' },
  tintPanel: { padding: 12, borderRadius: 14, backgroundColor: '#20243A', marginBottom: 8 },
  tintChoice: { padding: 10, marginRight: 8, marginVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: '#44485E', alignItems: 'center' },
  tintSelected: { borderColor: '#FFFFFF' },
  tintSwatch: { width: 32, height: 32, borderRadius: 16, marginBottom: 6 },
  audioCard: {
    width: '100%', minHeight: 280, backgroundColor: '#20243A',
    borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', padding: 20, marginBottom: 8,
  },
  row: {
    flexDirection: 'row', width: '100%', marginVertical: 8,
  },
  half: { flex: 1, marginHorizontal: 3 },
  choices: {
    flexDirection: 'row', marginBottom: 15,
  },
  choice: {
    backgroundColor: '#2455D6', padding: 10, borderRadius: 10,
    marginHorizontal: 8, borderWidth: 3, borderColor: 'transparent',
  },
  selected: { borderWidth: 3, borderColor: 'white' },
  timer: {
    color: 'white', fontSize: 44, fontWeight: 'bold',
    marginVertical: 12,
  },
  battleRow: {
    flexDirection: 'row', width: '100%', marginVertical: 15,
  },
  battleSeat: {
    flex: 1, minHeight: 170, backgroundColor: '#20243A',
    borderRadius: 14, margin: 4, alignItems: 'center',
    justifyContent: 'center', padding: 8,
  },
  resultText: {
    color: 'white', fontSize: 18, fontWeight: 'bold',
    textAlign: 'center', marginVertical: 8,
  },
  swatch: {
    width: 60, height: 45, borderRadius: 10,
    marginHorizontal: 8,
  },
  room: {
    width: '100%', borderRadius: 18, padding: 10,
    alignItems: 'center', marginBottom: 20,
  },
  seats: {
    width: '100%', flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  seat: {
    width: '23%', minHeight: 80, backgroundColor: '#2455D6',
    borderRadius: 10, marginBottom: 8, alignItems: 'center',
    justifyContent: 'center', borderWidth: 3,
    borderColor: 'transparent', paddingVertical: 6,
  },
  vipSeat: { backgroundColor: '#654398' },
  seatText: {
    color: 'white', fontSize: 11, fontWeight: 'bold',
    textAlign: 'center', marginVertical: 3,
  },
  giftScroll: { flex: 1, width: '100%' },
  giftLevelCard: {
    backgroundColor: '#241526',
    borderColor: '#805575',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginVertical: 12,
    gap: 6,
  },
  giftLevelTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#53364E',
    overflow: 'hidden',
    marginVertical: 4,
  },
  giftLevelFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FF5EAA',
  },
  giftGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gift: {
    width: '48%', minHeight: 125, backgroundColor: '#20243A',
    borderRadius: 12, padding: 9, marginBottom: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  giftEmoji: { fontSize: 30, marginBottom: 5 },
  giftName: {
    color: 'white', fontSize: 14, fontWeight: 'bold',
    textAlign: 'center',
  },
  giftPrice: {
    color: '#A8C4FF', fontSize: 13, marginTop: 7,
    textAlign: 'center',
  },
  avatar: {
    width: 105, height: 105, borderRadius: 55,
    backgroundColor: '#2455D6', alignItems: 'center',
    justifyContent: 'center', marginBottom: 15,
  },
  liveRing: { borderWidth: 4, borderColor: '#FF243C' },
  liveCreators: { width: '100%', flexGrow: 0, marginBottom: 10 },
  liveCreator: { alignItems: 'center', width: 96, paddingHorizontal: 5 },
  liveAvatarSmall: { width: 64, height: 64, marginBottom: 4 },
  liveAvatarSmallText: { fontSize: 30 },
  avatarText: {
    color: 'white', fontSize: 52, fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#20243A', color: 'white',
    width: '100%', padding: 13, borderRadius: 10,
    fontSize: 16, marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  videoBox: {
    width: '100%', height: 220, backgroundColor: '#20243A',
    borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', marginBottom: 14, padding: 15,
  },
  playbackPage: {
    flex: 1, backgroundColor: '#101020',
    paddingHorizontal: 18, paddingTop: 60, paddingBottom: 28,
  },
  playbackVideo: {
    flex: 1, minHeight: 160, width: '100%',
    backgroundColor: '#000', borderRadius: 16,
    marginBottom: 12,
  },
});
