import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc 
} from 'firebase/firestore';
import { 
  Dices, Shield, Heart, Zap, Coins, Users, Lock, Eye, EyeOff, 
  Sparkles, BookOpen, Compass, ChevronRight, UserCheck, RefreshCw, 
  Award, AlertTriangle, Sword, MessageSquare, Play, Trophy, MapPin, Search
} from 'lucide-react';

// Firebase Configuration Setup
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-project.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-project.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:demo"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'oneway-trpg-app';

// 地形データ
const TERRAIN_DATA = {
  草原: { name: '草原', effect: '特殊効果なし', bg: 'from-emerald-900 to-green-950', border: 'border-emerald-600', icon: '🌿' },
  雪原: { name: '雪原', effect: 'PCの【ST】が減少するとき、さらに【ST】が1点減少', bg: 'from-cyan-900 to-slate-900', border: 'border-cyan-500', icon: '❄️' },
  砂漠: { name: '砂漠', effect: 'PCの【LIFE】が減少するとき、さらに【LIFE】が1点減少', bg: 'from-amber-900 to-yellow-950', border: 'border-amber-600', icon: '🏜️' },
  火山: { name: '火山', effect: '「ファンブル表」のすべての効果に「溶岩に落ちかける。【LIFE】が1D6減少する」が加わる', bg: 'from-red-950 to-orange-950', border: 'border-red-600', icon: '🌋' },
  荒野: { name: '荒野', effect: '探索で施設が出現した場合、施設以外が出現するまでサイコロを振り直す', bg: 'from-stone-800 to-amber-950', border: 'border-stone-500', icon: '🪨' },
  山岳地帯: { name: '山岳地帯', effect: '進行で減少する【ST】が2増加する', bg: 'from-slate-800 to-stone-900', border: 'border-slate-500', icon: '⛰️' },
  遺跡群: { name: '遺跡群', effect: '探索でダンジョンが出現した場合、ダンジョン遭遇表を使用する回数を一回増やし、好きなもの１つを選択できる。', bg: 'from-purple-950 to-slate-900', border: 'border-purple-500', icon: '🏛️' },
  侵食地帯: { name: '侵食地帯', effect: '4日目以降にしか設置不可。出現するモンスター全ての【LIFE】が3増加し、【反撃ダメージ】が2増加する。', bg: 'from-fuchsia-950 to-purple-950', border: 'border-fuchsia-600', icon: '🕳️' }
};

// 日数＆2D6ロール結果による地形決定表
const TERRAIN_TABLES = {
  day1_2: { 2:'火山', 3:'遺跡群', 4:'雪原', 5:'雪原', 6:'草原', 7:'草原', 8:'草原', 9:'砂漠', 10:'砂漠', 11:'遺跡群', 12:'山岳地帯' },
  day3:   { 2:'火山', 3:'荒野', 4:'遺跡群', 5:'雪原', 6:'雪原', 7:'草原', 8:'砂漠', 9:'砂漠', 10:'遺跡群', 11:'火山', 12:'山岳地帯' },
  day4:   { 2:'侵食地帯', 3:'火山', 4:'遺跡群', 5:'砂漠', 6:'雪原', 7:'草原', 8:'荒野', 9:'遺跡群', 10:'火山', 11:'山岳地帯', 12:'山岳地帯' },
  day5_6: { 2:'侵食地帯', 3:'火山', 4:'遺跡群', 5:'砂漠', 6:'雪原', 7:'草原', 8:'荒野', 9:'遺跡群', 10:'火山', 11:'山岳地帯', 12:'侵食地帯' }
};

// クエストカード一覧 (1～48)
const QUEST_CARDS = [
  { id: 1, name: "すごいと言われたい", condition: "セッション中に1回スペシャルを発生させる", exp: 5, target: "知力15", judge: "最近読んだ本の感想を話す。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【優秀な】" },
  { id: 2, name: "まだ食べられる！", condition: "二日目以降、【ST】が最大値で【おいしい弁当】を使用", exp: 5, target: "意志8", judge: "大食いのテクニックを解説する。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【ムチムチな】" },
  { id: 3, name: "そんな人だったんだ……", condition: "昼の行動で交流を行い判定成功", exp: 5, target: "生命9", judge: "性的嗜好について語る。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【エッチな】" },
  { id: 4, name: "やられる……!?", condition: "魔王と遭遇したとき", exp: 10, target: "魅力10", judge: "世界を救う意気込みを魔王に聞かせる。", clear: "自分が死なずに戦闘終了", reward: "伝説P 10 / 特徴【ドMの】" },
  { id: 5, name: "誰も止められない", condition: "モンスター以外のNPCと戦闘を行う", exp: 5, target: "筋力8", judge: "汚い手で衛兵を倒す神々の描写。", clear: "戦闘に勝利する", reward: "伝説P 10 / 特徴【違法】" },
  { id: 6, name: "世界最弱を目指して", condition: "モンスターから逃亡する", exp: 5, target: "魅力8", judge: "自分の弱さのアピール。", clear: "戦闘に敗北する", reward: "伝説P 10 / 特徴【弱そうな】" },
  { id: 7, name: "好きです！ 女性版", condition: "女性PCに対して好意3を獲得", exp: 5, target: "素早10", judge: "告白のセリフを言う。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【女好きな】" },
  { id: 8, name: "好きです！ 男性版", condition: "男性PCに対して好意3を獲得", exp: 5, target: "敏捷10", judge: "告白のセリフを言う。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【男好きな】" },
  { id: 9, name: "ガチガチだ！", condition: "二日目に到達する", exp: 5, target: "生命11", judge: "奴も硬いが自分も硬いというアピール。", clear: "ST減少なしで戦闘終了", reward: "伝説P 10 / 特徴【やたら硬い】" },
  { id: 10, name: "ライバル登場", condition: "二日目に到達する", exp: 5, target: "意志7", judge: "獲物との因縁を話す。", clear: "戦闘に勝利する", reward: "伝説P 10 / 特徴【強そうな】" },
  { id: 11, name: "海の男", condition: "港・ギルド等の施設に遭遇", exp: 10, target: "知力12", judge: "過去を知る男を始末する様子。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【海賊】" },
  { id: 12, name: "宝の匂い", condition: "【豪華な宝箱】の解錠判定に成功", exp: 10, target: "敏捷12", judge: "宝の匂いがどんな匂いか説明する。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【冒険家】" },
  { id: 13, name: "最強の人間", condition: "六日目に到達する", exp: 10, target: "筋力11", judge: "世界最強を目指してきた道のりを話す。", clear: "戦闘に勝利する", reward: "伝説P 30 / 特徴【最強の】" },
  { id: 14, name: "イーリスのお願い", condition: "イーリスに好意1以上獲得", exp: 10, target: "知力10", judge: "一緒にどんな旅をしたいか語る。", clear: "イベント判定に成功", reward: "伝説P 10 / 特徴【妖精】" },
  { id: 15, name: "仲間たちの歌", condition: "他PC全員に好意2以上獲得", exp: 10, target: "魅力12", judge: "詩的なことを言う。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【詩人】" },
  { id: 16, name: "勇者の目覚め", condition: "装備中のアイテム破壊時", exp: 10, target: "生命12", judge: "裸の快適さと勇気について語る。", clear: "イベント判定に成功", reward: "伝説P 20 / クラス【勇者】" },
  { id: 17, name: "いつかどこかで", condition: "最終日夜終了時にLv8以上", exp: 0, target: "自動", judge: "世界の果ての弓を引き抜く描写。", clear: "イベントが終了する", reward: "伝説P 10 / アイテム【世界の果ての弓】" },
  { id: 18, name: "素敵な衣装", condition: "魔王と遭遇したとき", exp: 5, target: "敏捷13", judge: "魔王の脱ぎ捨てたコートを観察。", clear: "イベント判定に成功", reward: "伝説P 10 / アイテム【魔王のコート】" },
  { id: 19, name: "個性的な旅", condition: "一日目に到達する", exp: 0, target: "自動", judge: "個性的あふれる旅路を語る。", clear: "エンディングに到達", reward: "伝説P 20" },
  { id: 20, name: "厳しい旅", condition: "魔王と遭遇したとき", exp: 5, target: "戦闘", judge: "【凶悪な魔王】との戦闘に挑む。", clear: "魔王を撃破する", reward: "伝説P 40" },
  { id: 21, name: "珍しい宝石", condition: "魔王と遭遇したとき", exp: 5, target: "戦闘", judge: "物持ちの魔王が持つ心臓を狙う。", clear: "魔王を撃破する", reward: "伝説P 10 / アイテム【魔王の心臓】" },
  { id: 22, name: "やさしい旅", condition: "城を出る際に公開", exp: 0, target: "自動", judge: "【癒しの鉢植え】を取り出す。", clear: "イベントが終了する", reward: "なし" },
  { id: 23, name: "変態狩り", condition: "二日目に到達する", exp: 5, target: "知力9", judge: "【変態の盗賊】の悪行を語る。", clear: "戦闘に勝利する", reward: "伝説P 20" },
  { id: 24, name: "探索の果て", condition: "二日目に到達する", exp: 5, target: "敏捷9", judge: "【幻のクマ】を追った冒険を語る。", clear: "戦闘に勝利する", reward: "伝説P 20" },
  { id: 25, name: "ネームド狩り", condition: "モンスターを3体倒す", exp: 5, target: "生命9", judge: "対抗して二つ名を名乗る。", clear: "戦闘に勝利する", reward: "伝説P 20" },
  { id: 26, name: "借金回収", condition: "施設を3つ訪れる", exp: 10, target: "魅力10", judge: "お金を返すように説得する。", clear: "イベント判定に成功", reward: "伝説P 20" },
  { id: 27, name: "どうしよう？", condition: "四日目に到達する", exp: 5, target: "敏捷", judge: "【古代種の雪ウサギ】を倒すか迷う。", clear: "イベントが終了する", reward: "伝説P 20" },
  { id: 28, name: "古代の地図", condition: "ダンジョンを3つ訪れる", exp: 5, target: "自動", judge: "古代の地図帖を開く。", clear: "イベントが終了する", reward: "伝説P 20" },
  { id: 29, name: "腕輪商人", condition: "2000シルバ入手", exp: 5, target: "魅力7", judge: "テンション高めにふるまう。", clear: "イベント判定に成功", reward: "伝説P 20" },
  { id: 30, name: "賞金稼ぎ", condition: "モンスターを3体倒す", exp: 5, target: "敏捷9", judge: "賞金の使い道を妄想する。", clear: "戦闘に勝利する", reward: "伝説P 30" },
  { id: 31, name: "闇の武具", condition: "施設を3つ訪れる", exp: 5, target: "知力10", judge: "【偉そうな老人】に敬意を払う。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 32, name: "不思議な思い出", condition: "任意PCに好意3獲得", exp: 5, target: "判定", judge: "思い出を語り合う。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 33, name: "薬師の記憶", condition: "【半獣人】PCに好意2獲得", exp: 5, target: "自動", judge: "記憶を辿る。", clear: "イベントが終了する", reward: "伝説P 10 / ネムリのしっぽ" },
  { id: 34, name: "牢獄の王女", condition: "四日目に到達する", exp: 10, target: "判定", judge: "王女を救出する覚悟。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 35, name: "覇王との出会い", condition: "魔王と遭遇したとき", exp: 5, target: "判定", judge: "覇王ヴィクターとの対峙。", clear: "イベント判定に成功", reward: "伝説P 10 / ヴィクターの王冠" },
  { id: 36, name: "王女の記憶", condition: "【アンデッド】で二日目到達", exp: 10, target: "判定", judge: "王女の過去を回想する。", clear: "イベント判定に成功", reward: "伝説P 30 / 手紙" },
  { id: 37, name: "覇王の記憶", condition: "二日目に到達する", exp: 5, target: "判定", judge: "覇王の記憶を追体験する。", clear: "イベント判定に成功", reward: "伝説P 20 / 次クエスト解放" },
  { id: 38, name: "魔王との会話", condition: "魔王にクスリを使用", exp: 5, target: "判定", judge: "魔王との心を通わせる言葉。", clear: "イベント判定に成功", reward: "伝説P 10 / 魔王の髪飾り" },
  { id: 39, name: "傭兵との出会い", condition: "1000シルバ獲得", exp: 5, target: "自動", judge: "傭兵と酒を交わす。", clear: "イベントが終了する", reward: "伝説P 10 / 次クエスト解放" },
  { id: 40, name: "魔王の記憶", condition: "聖武具を獲得", exp: 10, target: "判定", judge: "聖なる光に映る魔王の真実。", clear: "イベント判定に成功", reward: "伝説P 20 / 次クエスト解放" },
  { id: 41, name: "傭兵の記憶", condition: "2000シルバ獲得", exp: 10, target: "判定", judge: "傭兵の真の目的を聞く。", clear: "イベント判定に成功", reward: "伝説P 40" },
  { id: 42, name: "黒騎士との戦い", condition: "二日目に到達する", exp: 5, target: "戦闘", judge: "黒騎士の刃を受ける。", clear: "イベント時間経過", reward: "伝説P 10 / 次クエスト解放" },
  { id: 43, name: "耳長の村で", condition: "耳長の村を訪れる", exp: 5, target: "生命11", judge: "闇の勇者とは何かを語る。", clear: "イベント判定に成功", reward: "伝説P 10 / 次クエスト解放" },
  { id: 44, name: "黒騎士の記憶", condition: "任意PCに好意3獲得", exp: 5, target: "判定", judge: "黒騎士との絆を確かめる。", clear: "イベント判定に成功", reward: "伝説P 40" },
  { id: 45, name: "太古の言い伝え", condition: "【竜人の戦士】と遭遇", exp: 5, target: "戦闘", judge: "竜人の誇りに応える。", clear: "戦闘に勝利する", reward: "伝説P 10 / 次クエスト解放" },
  { id: 46, name: "闇の竜", condition: "聖武具を獲得", exp: 0, target: "戦闘", judge: "暗黒竜との最終決戦。", clear: "戦闘に勝利する", reward: "伝説P 100 / 栄誉" },
  { id: 47, name: "鱗の守護者", condition: "六日目に到達する", exp: 15, target: "戦闘", judge: "ゴーレムとの決闘。", clear: "戦闘に勝利する", reward: "伝説P 40 / 鱗の盾" },
  { id: 48, name: "牙の守護者", condition: "六日目に到達する", exp: 15, target: "戦闘", judge: "死雲の騎士を打ち倒す。", clear: "戦闘に勝利する", reward: "伝説P 40 / 牙の剣" }
];

// ランダムイベント種別生成
const EVENT_CATEGORIES = ['施設表', '世界の旅表', '野外遭遇表', 'ダンジョン表'];

const EVENT_DETAILS = {
  施設表: [
    { title: "施設を探す", check: "敏捷/筋力", judge: "村や施設で何か役に立つ場所がないか注意深く調べる。", detail: "2D6で【村遭遇表】または特定の施設（山小屋・聖なる神殿・闇ギルド等）のイベントが発生する。" },
    { title: "交易・休憩施設", check: "知力/魅力", judge: "施設内の人々と交渉し、旅の準備を整える。", detail: "道具屋・武器屋・防具屋との商談や【おいしいお弁当】の購入ができる。" }
  ],
  世界の旅表: [
    { title: "道中の出来事 (D66:11〜33)", check: "判定表準拠", judge: "遭遇した旅人や風物に対して自分の旅の目的や考えを語る。", detail: "【宝箱】発見、【実のなる木】登り、または【野営中の兵士】との会話。成功で経験値やアイテム獲得。" },
    { title: "異境の旅路 (D66:34〜66)", check: "判定表準拠", judge: "過酷な旅路における体調管理や同行者との絆を描写する。", detail: "【旅の料理人】との料理の注文や【女神像】への祈り、【次元倉庫】の開放。" }
  ],
  野外遭遇表: [
    { title: "野生モンスター遭遇", check: "敏捷/筋力", judge: "物陰から襲いかかる魔物に対処する動きを描写する。", detail: "現在の地形に応じた【野外モンスター表】（1D6）を参照。1が出たら敵にランダム特徴付与。" },
    { title: "群れ・特殊遭遇", check: "生命/意志", judge: "敵の群れに包囲された絶望的状況から反撃の機を伺う。", detail: "4:アンデッドの群れ / 5:盗賊の群れ / 6:希少動物表。成功で先制、失敗で不意打ち。" }
  ],
  ダンジョン表: [
    { title: "危険な地下迷宮", check: "敏捷/知力", judge: "暗闇と罠に包まれたダンジョン内を慎重に進む。", detail: "1D6ロール（4日目以降+1）。1~2:犬小屋 / 3~4:小型ダンジョン / 5:中型 / 6:大型 / 7:牢獄。" },
    { title: "ダンジョン遭遇 (2D6)", check: "各能力値", judge: "壁と闇に挟まれたり、死霊の騎士や竜人の戦士と対峙する。", detail: "出目に応じて宝箱や強力な敵が出現。成功で経験値・優位な戦闘条件を獲得。" }
  ]
};

export default function App() {
  // Auth & Room state
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalDays, setTotalDays] = useState(4);

  // Firestore Synced Room Data
  const [roomData, setRoomData] = useState(null);

  // UI Local state
  const [selectedQuestId, setSelectedQuestId] = useState(null);
  const [diceLogs, setDiceLogs] = useState([]);
  const [chatMessage, setChatMessage] = useState('');
  const [activeTab, setActiveTab] = useState('board'); // board, character, reference
  const chatBottomRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !joinedRoom || !roomId) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomData(data);
        
        // ローカルでのクエスト選択状態復元
        if (data.players && data.players[user.uid]?.questId) {
          setSelectedQuestId(data.players[user.uid].questId);
        }
      }
    }, (error) => {
      console.error("Room sync error:", error);
    });

    return () => unsubscribe();
  }, [user, joinedRoom, roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData?.logs]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return alert("プレイヤー名を入力してください");
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // 1日目のイベント初期配置生成
    const initialEvents = generateDayEvents(1);
    const initialTerrainRoll = rollDice(2);
    const initialTerrain = TERRAIN_TABLES.day1_2[initialTerrainRoll.sum];

    const newRoomState = {
      roomId: newRoomId,
      hostId: user.uid,
      maxPlayers: Number(maxPlayers),
      totalDays: Number(totalDays),
      currentDay: 1,
      phase: 'lobby', // 'lobby', 'quest_select', 'playing', 'ended'
      terrains: { 1: initialTerrain },
      events: { 1: initialEvents }, // { day: { north: {...}, center: {...}, south: {...} } }
      players: {
        [user.uid]: {
          uid: user.uid,
          name: playerName,
          hp: 20,
          maxHp: 20,
          st: 10,
          maxSt: 10,
          exp: 0,
          level: 1,
          silver: 500,
          favor: {}, // { targetUid: points }
          questId: null,
          isReady: false
        }
      },
      logs: [
        { id: Date.now(), sender: 'システム', text: `ルーム [${newRoomId}] が作成されました。`, time: new Date().toLocaleTimeString() }
      ]
    };

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', newRoomId);
    await setDoc(roomRef, newRoomState);
    setRoomId(newRoomId);
    setJoinedRoom(true);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) return alert("プレイヤー名を入力してください");
    if (!roomId.trim()) return alert("ルームIDを入力してください");
    const targetRoomId = roomId.toUpperCase();

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', targetRoomId);
    const docSnap = await getDoc(roomRef);

    if (!docSnap.exists()) {
      return alert("指定されたルームが見つかりません");
    }

    const data = docSnap.data();
    if (Object.keys(data.players || {}).length >= data.maxPlayers) {
      return alert("ルーム満員です");
    }

    const updatedPlayers = {
      ...data.players,
      [user.uid]: {
        uid: user.uid,
        name: playerName,
        hp: 20,
        maxHp: 20,
        st: 10,
        maxSt: 10,
        exp: 0,
        level: 1,
        silver: 500,
        favor: {},
        questId: null,
        isReady: false
      }
    };

    const newLogs = [
      ...(data.logs || []),
      { id: Date.now(), sender: 'システム', text: `${playerName} さんが参加しました。`, time: new Date().toLocaleTimeString() }
    ];

    await updateDoc(roomRef, { players: updatedPlayers, logs: newLogs });
    setRoomId(targetRoomId);
    setJoinedRoom(true);
  };

  function rollDice(count = 1, sides = 6) {
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { rolls, sum };
  }

  // 同日内で重ならない3つのイベントを抽出
  function generateDayEvents(day) {
    const shuffledCategories = [...EVENT_CATEGORIES].sort(() => Math.random() - 0.5);
    const selected3 = shuffledCategories.slice(0, 3);
    const positions = ['north', 'center', 'south'];

    const dayEvents = {};
    positions.forEach((pos, idx) => {
      const cat = selected3[idx];
      const details = EVENT_DETAILS[cat];
      const randomDetail = details[Math.floor(Math.random() * details.length)];

      dayEvents[pos] = {
        category: cat,
        title: randomDetail.title,
        check: randomDetail.check,
        judge: randomDetail.judge,
        detail: randomDetail.detail,
        isRevealed: false,
        revealedBy: null
      };
    });
    return dayEvents;
  }

  // ゲーム開始（ホスト権限）
  const handleStartGame = async () => {
    if (user.uid !== roomData.hostId) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await updateDoc(roomRef, { phase: 'playing' });
  };

  // クエストカードの選択
  const handleSelectQuest = async (questId) => {
    if (!roomData) return;

    // 他のプレイヤーが選択済みか判定
    const takenByOther = Object.entries(roomData.players || {}).some(
      ([pUid, pData]) => pUid !== user.uid && pData.questId === questId
    );

    if (takenByOther) {
      return alert("このクエストカードは既に他のプレイヤーに選択されています。");
    }

    setSelectedQuestId(questId);
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    
    await updateDoc(roomRef, {
      [`players.${user.uid}.questId`]: questId
    });
  };

  // イベントめくり（公開）
  const handleRevealEvent = async (position) => {
    if (!roomData || !user) return;
    const currentDay = roomData.currentDay;
    const currentDayEvents = roomData.events[currentDay];
    if (!currentDayEvents || !currentDayEvents[position]) return;

    if (currentDayEvents[position].isRevealed) return; // 既に公開済

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const player = roomData.players[user.uid];

    const updatedEvents = {
      ...roomData.events,
      [currentDay]: {
        ...currentDayEvents,
        [position]: {
          ...currentDayEvents[position],
          isRevealed: true,
          revealedBy: player.name
        }
      }
    };

    const newLog = {
      id: Date.now(),
      sender: '探索',
      text: `${player.name} が【${position === 'north' ? '北' : position === 'center' ? '中央' : '南'}エリア】のイベント『${currentDayEvents[position].category}：${currentDayEvents[position].title}』を解明・公開しました！`,
      time: new Date().toLocaleTimeString()
    };

    await updateDoc(roomRef, {
      events: updatedEvents,
      logs: [...(roomData.logs || []), newLog]
    });
  };

  // 次の日へ進む（地形ロール含む）
  const handleAdvanceDay = async () => {
    if (user.uid !== roomData.hostId) return;
    const nextDay = roomData.currentDay + 1;
    if (nextDay > roomData.totalDays) {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
      await updateDoc(roomRef, { phase: 'ended' });
      return;
    }

    // 次の日の地形ロール
    let tableKey = 'day1_2';
    if (nextDay === 3) tableKey = 'day3';
    else if (nextDay === 4) tableKey = 'day4';
    else if (nextDay >= 5) tableKey = 'day5_6';

    const diceRes = rollDice(2);
    const newTerrain = TERRAIN_TABLES[tableKey][diceRes.sum];
    const newDayEvents = generateDayEvents(nextDay);

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const newLog = {
      id: Date.now(),
      sender: 'システム',
      text: `【${nextDay}日目】が開始しました。地形決定ロール (2D6=${diceRes.sum}) ➔ 地形：【${newTerrain}】`,
      time: new Date().toLocaleTimeString()
    };

    await updateDoc(roomRef, {
      currentDay: nextDay,
      [`terrains.${nextDay}`]: newTerrain,
      [`events.${nextDay}`]: newDayEvents,
      logs: [...(roomData.logs || []), newLog]
    });
  };

  // ダイスを振る＆チャット共有
  const handleRollSharedDice = async (count, label = "ダイス判定") => {
    const res = rollDice(count);
    const player = roomData?.players?.[user.uid];
    const logText = `${player ? player.name : '誰か'}が ${label} で ${count}D6 を振りました ➔ [ ${res.rolls.join(', ')} ] 合計: ${res.sum}`;

    if (roomData && roomId) {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
      await updateDoc(roomRef, {
        logs: [...(roomData.logs || []), { id: Date.now(), sender: 'ダイス', text: logText, time: new Date().toLocaleTimeString() }]
      });
    }
  };

  // ステータス更新
  const handleUpdatePlayerStat = async (statKey, delta) => {
    if (!roomData || !user) return;
    const currentVal = roomData.players[user.uid][statKey] || 0;
    const newVal = Math.max(0, currentVal + delta);

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await updateDoc(roomRef, {
      [`players.${user.uid}.${statKey}`]: newVal
    });
  };

  // チャット送信
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !roomData) return;
    const player = roomData.players[user.uid];
    
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await updateDoc(roomRef, {
      logs: [...(roomData.logs || []), {
        id: Date.now(),
        sender: player.name,
        text: chatMessage,
        time: new Date().toLocaleTimeString()
      }]
    });
    setChatMessage('');
  };

  if (!joinedRoom || !roomData) {
    return (
      <div className="min-h-screen bg-stone-950 text-amber-100 font-serif flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-900 border-2 border-amber-600/60 rounded-xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600"></div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-widest text-amber-400 drop-shadow flex items-center justify-center gap-2">
              <Sword className="w-8 h-8 text-amber-500" />
              片道勇者 TRPG
            </h1>
            <p className="text-xs text-stone-400">GMレス・リアルタイムセッションシステム</p>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-amber-300 mb-1 font-semibold">プレイヤー名</label>
              <input 
                type="text" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="例: 勇者オルフェ" 
                className="w-full bg-stone-950 border border-stone-700 rounded p-2 text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 border-t border-stone-800 grid grid-cols-2 gap-3">
              <button 
                onClick={handleCreateRoom}
                className="bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-bold py-2 px-4 rounded border border-amber-500/50 shadow transition"
              >
                新しい部屋を作成
              </button>
              <div className="space-y-1">
                <input 
                  type="text" 
                  value={roomId} 
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="ルームID" 
                  className="w-full bg-stone-950 border border-stone-700 rounded p-2 text-stone-200 uppercase text-center font-mono focus:outline-none focus:border-amber-500 text-xs"
                />
                <button 
                  onClick={handleJoinRoom}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold py-1.5 px-3 rounded border border-stone-600 text-xs transition"
                >
                  既存の部屋に参加
                </button>
              </div>
            </div>

            <div className="bg-stone-950/60 p-3 rounded border border-stone-800 space-y-2">
              <p className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Compass className="w-4 h-4" /> ルーム設定 (作成時のみ有効)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-stone-400 block">最大人数</label>
                  <select 
                    value={maxPlayers} 
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded p-1 text-stone-200"
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} 人</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-stone-400 block">冒険日数</label>
                  <select 
                    value={totalDays} 
                    onChange={(e) => setTotalDays(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded p-1 text-stone-200"
                  >
                    {[2, 4, 6].map(d => <option key={d} value={d}>{d} 日間</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const myData = roomData.players?.[user.uid] || {};
  const currentTerrainName = roomData.terrains?.[roomData.currentDay] || '草原';
  const currentTerrainObj = TERRAIN_DATA[currentTerrainName] || TERRAIN_DATA['草原'];
  const currentDayEvents = roomData.events?.[roomData.currentDay] || {};

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-serif flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* メインエリア（左側/中央） */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* ヘッダー/ステータスバー */}
        <header className="bg-stone-900 border-b border-stone-800 p-3 px-4 flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-amber-400 flex items-center gap-1.5">
              <Sword className="w-5 h-5 text-amber-500" />
              片道勇者TRPG
            </h1>
            <span className="bg-stone-800 border border-stone-700 px-2 py-0.5 rounded text-xs font-mono text-amber-300">
              ROOM: {roomData.roomId}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-full">
              <Compass className="w-4 h-4 text-amber-400" />
              <span className="text-amber-200 font-bold">【 {roomData.currentDay} / {roomData.totalDays} 日目 】</span>
            </div>

            {user.uid === roomData.hostId && (
              <button
                onClick={handleAdvanceDay}
                className="bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold px-3 py-1 rounded flex items-center gap-1 border border-amber-500 shadow transition"
              >
                次の日へ進む <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* タブ切替 */}
        <div className="bg-stone-900/80 border-b border-stone-800 px-4 flex gap-2 text-sm">
          <button
            onClick={() => setActiveTab('board')}
            className={`py-2 px-4 border-b-2 font-bold flex items-center gap-1.5 transition ${
              activeTab === 'board' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <MapPin className="w-4 h-4" /> 冒険マップ & イベント
          </button>
          <button
            onClick={() => setActiveTab('character')}
            className={`py-2 px-4 border-b-2 font-bold flex items-center gap-1.5 transition ${
              activeTab === 'character' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <UserCheck className="w-4 h-4" /> ステータス & クエスト
          </button>
          <button
            onClick={() => setActiveTab('reference')}
            className={`py-2 px-4 border-b-2 font-bold flex items-center gap-1.5 transition ${
              activeTab === 'reference' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" /> ルール・各種表
          </button>
        </div>

        {/* メインコンテンツ表示域 */}
        <main className="flex-1 p-4 overflow-y-auto space-y-6">

          {}
          {activeTab === 'board' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              {/* 地形エリア表示 */}
              <div className={`bg-gradient-to-r ${currentTerrainObj.bg} border-2 ${currentTerrainObj.border} rounded-xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden`}>
                <div className="flex items-center gap-3 z-10">
                  <span className="text-4xl">{currentTerrainObj.icon}</span>
                  <div>
                    <span className="text-xs text-stone-400 uppercase tracking-widest block">本日の地形</span>
                    <h2 className="text-2xl font-bold text-stone-100 drop-shadow">{currentTerrainObj.name}</h2>
                  </div>
                </div>
                <div className="bg-stone-950/70 border border-stone-800 p-3 rounded-lg text-xs max-w-xl text-stone-300 z-10">
                  <span className="text-amber-400 font-bold block mb-0.5">【地形効果】</span>
                  {currentTerrainObj.effect}
                </div>
              </div>

              {/* 3エリアの非公開/公開イベントカード */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { pos: 'north', label: '北エリア' },
                  { pos: 'center', label: '中央エリア' },
                  { pos: 'south', label: '南エリア' }
                ].map(({ pos, label }) => {
                  const ev = currentDayEvents[pos];
                  return (
                    <div 
                      key={pos} 
                      className={`bg-stone-900 border-2 ${ev?.isRevealed ? 'border-amber-600/80' : 'border-stone-800'} rounded-xl p-4 shadow-xl flex flex-col justify-between min-h-[260px] relative transition hover:border-amber-500/50`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3 border-b border-stone-800 pb-2">
                          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                            {label}
                          </span>
                          {ev?.isRevealed ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1 font-sans">
                              <Eye className="w-3.5 h-3.5" /> 公開済み ({ev.revealedBy})
                            </span>
                          ) : (
                            <span className="text-xs text-stone-500 flex items-center gap-1 font-sans">
                              <EyeOff className="w-3.5 h-3.5" /> 未公開
                            </span>
                          )}
                        </div>

                        {ev ? (
                          ev.isRevealed ? (
                            /* 公開後のカード表示 */
                            <div className="space-y-3">
                              <div>
                                <span className="text-xs text-amber-500 font-bold">{ev.category}</span>
                                <h3 className="text-lg font-bold text-stone-100">{ev.title}</h3>
                              </div>

                              <div className="bg-stone-950/80 p-2.5 rounded border border-stone-800 text-xs space-y-1.5">
                                <p><span className="text-amber-300 font-bold">推奨判定:</span> 【{ev.check}】</p>
                                <p><span className="text-amber-300 font-bold">ジャッジ:</span> {ev.judge}</p>
                                <p className="text-stone-300 pt-1 border-t border-stone-800">{ev.detail}</p>
                              </div>
                            </div>
                          ) : (
                            /* 未公開（裏面）カード表示 */
                            <div className="flex flex-col items-center justify-center my-6 space-y-3 text-center">
                              <div className="w-16 h-16 rounded-full bg-stone-950 border border-amber-600/40 flex items-center justify-center shadow-inner">
                                <Sparkles className="w-8 h-8 text-amber-500/70 animate-pulse" />
                              </div>
                              <p className="text-xs text-stone-400">未知のイベントが配置されています</p>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-12 text-stone-600 text-xs">イベントなし</div>
                        )}
                      </div>

                      {ev && !ev.isRevealed && (
                        <button
                          onClick={() => handleRevealEvent(pos)}
                          className="w-full mt-4 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-amber-100 font-bold py-2 rounded text-xs border border-amber-500/60 shadow transition flex items-center justify-center gap-1"
                        >
                          <Search className="w-4 h-4" /> 探索して公開（カードをめくる）
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* クエストカード選択エリア（ゲーム進行中/未選択の場合） */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    シークレット・クエストカード選択
                  </h3>
                  <span className="text-xs text-stone-400">他のプレイヤーには非公開（重複選択不可）</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1">
                  {QUEST_CARDS.map(q => {
                    const isSelectedByMe = myData.questId === q.id;
                    const takenByOther = Object.entries(roomData.players || {}).some(
                      ([pUid, pData]) => pUid !== user.uid && pData.questId === q.id
                    );

                    return (
                      <button
                        key={q.id}
                        disabled={takenByOther}
                        onClick={() => handleSelectQuest(q.id)}
                        className={`p-2.5 rounded border text-left text-xs transition relative flex flex-col justify-between h-20 ${
                          isSelectedByMe 
                            ? 'bg-amber-950/80 border-amber-500 text-amber-200 ring-2 ring-amber-500/50' 
                            : takenByOther 
                            ? 'bg-stone-950/60 border-stone-800 text-stone-600 cursor-not-allowed opacity-60' 
                            : 'bg-stone-950 hover:bg-stone-800 border-stone-700 text-stone-300'
                        }`}
                      >
                        <div className="font-bold truncate">#{q.id} {q.name}</div>
                        {takenByOther ? (
                          <span className="text-[10px] text-red-400 font-sans flex items-center gap-0.5">
                            <Lock className="w-3 h-3" /> 選択済み
                          </span>
                        ) : isSelectedByMe ? (
                          <span className="text-[10px] text-amber-400 font-sans font-bold flex items-center gap-0.5">
                            ★ あなたの選択
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500">選択可能</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 自分の選択しているクエストの詳細（自分のみ参照可） */}
                {selectedQuestId && (
                  <div className="mt-4 bg-amber-950/30 border border-amber-700/50 rounded-lg p-4 text-xs space-y-2">
                    <div className="flex justify-between items-center text-amber-400 font-bold border-b border-amber-800/60 pb-1">
                      <span>【選択中のクエスト】 #{selectedQuestId} {QUEST_CARDS[selectedQuestId - 1]?.name}</span>
                      <span className="text-stone-400 font-sans">経験値: +{QUEST_CARDS[selectedQuestId - 1]?.exp}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-stone-300">
                      <p><span className="text-amber-300 font-bold">公開条件:</span> {QUEST_CARDS[selectedQuestId - 1]?.condition}</p>
                      <p><span className="text-amber-300 font-bold">目標/判定:</span> {QUEST_CARDS[selectedQuestId - 1]?.target}</p>
                      <p><span className="text-amber-300 font-bold">ジャッジ:</span> {QUEST_CARDS[selectedQuestId - 1]?.judge}</p>
                      <p><span className="text-amber-300 font-bold">クリア報酬:</span> {QUEST_CARDS[selectedQuestId - 1]?.reward}</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {}
          {activeTab === 'character' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              
              {/* 自分のステータス操作パネル */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 border-b border-stone-800 pb-2">
                  <UserCheck className="w-5 h-5 text-amber-500" />
                  {myData.name || 'あなた'} のステータス管理
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* HP/LIFE */}
                  <div className="bg-stone-950 p-3 rounded border border-stone-800 text-center space-y-2">
                    <span className="text-xs text-red-400 font-bold flex items-center justify-center gap-1">
                      <Heart className="w-4 h-4" /> LIFE / HP
                    </span>
                    <div className="text-2xl font-bold font-mono text-stone-100">{myData.hp || 0}</div>
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleUpdatePlayerStat('hp', -1)} className="bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded border border-stone-600 text-xs">-1</button>
                      <button onClick={() => handleUpdatePlayerStat('hp', 1)} className="bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded border border-stone-600 text-xs">+1</button>
                    </div>
                  </div>

                  {/* ST */}
                  <div className="bg-stone-950 p-3 rounded border border-stone-800 text-center space-y-2">
                    <span className="text-xs text-cyan-400 font-bold flex items-center justify-center gap-1">
                      <Zap className="w-4 h-4" /> ST (スタミナ)
                    </span>
                    <div className="text-2xl font-bold font-mono text-stone-100">{myData.st || 0}</div>
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleUpdatePlayerStat('st', -1)} className="bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded border border-stone-600 text-xs">-1</button>
                      <button onClick={() => handleUpdatePlayerStat('st', 1)} className="bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded border border-stone-600 text-xs">+1</button>
                    </div>
                  </div>

                  {/* レベル/経験値 */}
                  <div className="bg-stone-950 p-3 rounded border border-stone-800 text-center space-y-2">
                    <span className="text-xs text-amber-400 font-bold flex items-center justify-center gap-1">
                      <Trophy className="w-4 h-4" /> レベル / 経験値
                    </span>
                    <div className="text-lg font-bold font-mono text-stone-100">Lv.{myData.level || 1} ({myData.exp || 0} Exp)</div>
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleUpdatePlayerStat('exp', 1)} className="bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded border border-stone-600 text-xs">+1 Exp</button>
                      <button onClick={() => handleUpdatePlayerStat('level', 1)} className="bg-stone-800 hover:bg-stone-700 px-2 py-0.5 rounded border border-stone-600 text-xs">+1 Lv</button>
                    </div>
                  </div>

                  {/* 所持金シルバ */}
                  <div className="bg-stone-950 p-3 rounded border border-stone-800 text-center space-y-2">
                    <span className="text-xs text-yellow-400 font-bold flex items-center justify-center gap-1">
                      <Coins className="w-4 h-4" /> シルバ (所持金)
                    </span>
                    <div className="text-xl font-bold font-mono text-stone-100">{myData.silver || 0} S</div>
                    <div className="flex justify-center gap-1">
                      <button onClick={() => handleUpdatePlayerStat('silver', -100)} className="bg-stone-800 hover:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-600 text-[10px]">-100</button>
                      <button onClick={() => handleUpdatePlayerStat('silver', 100)} className="bg-stone-800 hover:bg-stone-700 px-1.5 py-0.5 rounded border border-stone-600 text-[10px]">+100</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 全メンバーのステータス一覧 */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 border-b border-stone-800 pb-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  パーティーメンバー一覧 ({Object.keys(roomData.players || {}).length} 人)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.values(roomData.players || {}).map((p) => (
                    <div key={p.uid} className="bg-stone-950 border border-stone-800 rounded p-3 text-xs space-y-2">
                      <div className="flex justify-between items-center border-b border-stone-800 pb-1">
                        <span className="font-bold text-stone-200 text-sm">{p.name} {p.uid === user.uid && "(あなた)"}</span>
                        <span className="text-amber-400 font-mono">Lv.{p.level}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-stone-400 font-mono">
                        <div>LIFE: <span className="text-red-400 font-bold">{p.hp}</span></div>
                        <div>ST: <span className="text-cyan-400 font-bold">{p.st}</span></div>
                        <div>所持金: <span className="text-yellow-400">{p.silver}S</span></div>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        クエスト: {p.questId ? `選択済み (#${p.questId})` : '未選択'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {}
          {activeTab === 'reference' && (
            <div className="space-y-6 max-w-4xl mx-auto text-xs">
              
              {/* クイック参照表 */}
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg space-y-4">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 border-b border-stone-800 pb-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  ルール＆判定クイック参照表
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 魔王追撃表 */}
                  <div className="bg-stone-950 p-3 rounded border border-stone-800 space-y-2">
                    <h4 className="font-bold text-amber-300 border-b border-stone-800 pb-1">【魔王追撃表】 (1D6)</h4>
                    <ul className="space-y-1 text-stone-300">
                      <li><span className="text-amber-400 font-mono">1:</span> 装備以外の指定アイテム1つを失う</li>
                      <li><span className="text-amber-400 font-mono">2:</span> 装備のうち指定の1つを失う</li>
                      <li><span className="text-amber-400 font-mono">3:</span> 2D6×100 シルバを失う</li>
                      <li><span className="text-amber-400 font-mono">4:</span> 【LIFE】が 1D6 減少する</li>
                      <li><span className="text-amber-400 font-mono">5:</span> 【ST】が 1D6 減少する</li>
                      <li><span className="text-amber-400 font-mono">6:</span> 【LIFE】が 2D6 減少する</li>
                    </ul>
                  </div>

                  {/* 進行ルート表 */}
                  <div className="bg-stone-950 p-3 rounded border border-stone-800 space-y-2">
                    <h4 className="font-bold text-amber-300 border-b border-stone-800 pb-1">【進行ルート表】 (1D6)</h4>
                    <ul className="space-y-1 text-stone-300">
                      <li><span className="text-amber-400 font-mono">1:</span> 荒れ地 ➔ 【日数】-【筋力】分ST減少</li>
                      <li><span className="text-amber-400 font-mono">2:</span> 穏やか ➔ 【日数】-【敏捷】分ST減少</li>
                      <li><span className="text-amber-400 font-mono">3:</span> 険しい岩山 ➔ 【日数】+1-【生命】分ST減少</li>
                      <li><span className="text-amber-400 font-mono">4:</span> 山で迷う ➔ 【日数】+2-【知力】分ST減少</li>
                      <li><span className="text-amber-400 font-mono">5:</span> 川泳ぎ ➔ 【日数】+1-【意志】分ST減少</li>
                      <li><span className="text-amber-400 font-mono">6:</span> 船渡し ➔ 【日数】+2-【魅力】分ST減少</li>
                    </ul>
                  </div>
                </div>

                {/* 会話テーマ表 */}
                <div className="bg-stone-950 p-3 rounded border border-stone-800 space-y-2">
                  <h4 className="font-bold text-amber-300 border-b border-stone-800 pb-1">【会話テーマ表】 (1D6)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-stone-300">
                    <div>1: 身体の悩み【筋力】</div>
                    <div>2: 仕事の悩み【敏捷】</div>
                    <div>3: 家族の悩み【生命】</div>
                    <div>4: 勇者の悩み【知力】</div>
                    <div>5: 友人関係【意志】</div>
                    <div>6: 恋の悩み【魅力】</div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {}
      <div className="w-full md:w-80 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 flex flex-col h-72 md:h-full">
        
        {/* 共有ダイスローラー */}
        <div className="p-3 bg-stone-950 border-b border-stone-800 space-y-2">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Dices className="w-4 h-4 text-amber-500" /> 共有ダイスローラー
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRollSharedDice(1, "1D6ロール")}
              className="bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold py-1.5 px-3 rounded border border-stone-700 text-xs flex items-center justify-center gap-1 shadow"
            >
              <Dices className="w-3.5 h-3.5" /> 1D6 を振る
            </button>
            <button
              onClick={() => handleRollSharedDice(2, "2D6ロール")}
              className="bg-stone-800 hover:bg-stone-700 text-amber-200 font-bold py-1.5 px-3 rounded border border-stone-700 text-xs flex items-center justify-center gap-1 shadow"
            >
              <Dices className="w-3.5 h-3.5" /> 2D6 を振る
            </button>
          </div>
        </div>

        {/* ログ＆チャットエリア */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-sans">
          {(roomData.logs || []).map((log) => (
            <div key={log.id} className="bg-stone-950/70 border border-stone-800/80 p-2 rounded space-y-1">
              <div className="flex justify-between items-center text-[10px] text-stone-500">
                <span className="font-bold text-amber-400/90">{log.sender}</span>
                <span>{log.time}</span>
              </div>
              <p className="text-stone-200 leading-relaxed break-words">{log.text}</p>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* メッセージ入力 */}
        <form onSubmit={handleSendMessage} className="p-2 bg-stone-950 border-t border-stone-800 flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="bg-amber-700 hover:bg-amber-600 text-amber-100 font-bold px-3 py-1 rounded text-xs border border-amber-500 transition"
          >
            送信
          </button>
        </form>

      </div>

    </div>
  );
}