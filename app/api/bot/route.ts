export const dynamic = 'force-dynamic';

export const fetchCache = 'force-no-store';

import { Bot, webhookCallback, InlineKeyboard, Context, session, SessionFlavor } from 'grammy';
import { hydrate, HydrateFlavor } from "@grammyjs/hydrate";
import { freeStorage } from "@grammyjs/storage-free";
import { BotConfig, CMC_CoinInfo, CoinsList, Language, languages, UserConfig } from '@/types';
import { getPercentTitle, getSettingsTitle, getTimeIntervalTitle } from './localization';

interface SessionData {
  coinList: CoinsList;
  connectedUsers: Map<number, UserConfig>;
  userStates: Map<number, "waitPercent" | "waitTimeInterval">;
}

type MyContext = HydrateFlavor<Context> & SessionFlavor<SessionData>;

function initial(): SessionData {
  const coinList = {};
  const connectedUsers = new Map<number, UserConfig>();
  const userStates = new Map<number, 'waitPercent' | 'waitTimeInterval'>(); 
  return { connectedUsers, userStates, coinList };
}

const baseUrl = 'https://min-api.cryptocompare.com/data';

const botConfigDefault: BotConfig = {
  time: 15,
  percent:  20,
  lang: 'by'
};

// let coinList: CoinsList = {};
const coinListInterval = 24 * 60 * 60 * 1000;

// const connectedUsers = new Map<number, UserConfig>();
// const userStates = new Map<number, 'waitPercent' | 'waitTimeInterval'>(); 

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) throw new Error('TELEGRAM_BOT_TOKEN environment variable not found.');

const backKeyboard = new InlineKeyboard()
  .text('← Назад', 'back');

const chooseLanguage = new InlineKeyboard()
  .text('🇧🇾 Беларуский', 'by')
  .text('🇷🇺 Русский', 'ru')
  .row()
  .text('← Назад', 'back');
  

const bot = new Bot<MyContext>(token);
bot.use(hydrate());
bot.use(session({
  initial,
  storage: freeStorage<SessionData>(bot.token),
}));

bot.command('start', async (ctx) => {
  console.log('start');
  const userName = ctx.from?.first_name ?? (ctx.from?.language_code === 'en' ? 'User' : 'Пользователь');
  const chatId = ctx.chat.id;

  const { connectedUsers } = ctx.session;
  
  connectedUsers.delete(chatId);
  connectedUsers.set(chatId, { botConfig: botConfigDefault });

  await ctx.reply(
    `*Добро пожаловать, ${userName}*\\.\n\nТеперь вы подписаны на все памы/дампы\\.\n\nИспользуя команду /settings, вы можете изменить ряд ключевых параметров работы бота\\.\nTest data ${connectedUsers?.size}`,
    {
      parse_mode: 'MarkdownV2'
    }
  );

  setInterval(() => {
    console.log('two minute Interval');
  }, 2 * 60 * 1000);

  
  // await getCoinPrices(chatId);

  // restartCoinPricesInterval(chatId);
});

bot.command('stop', async (ctx) => {
  const chatId = ctx.chat.id;
  const { connectedUsers } = ctx.session;

  if (!connectedUsers.has(chatId)) {
    return;
  }

  const userConfig = connectedUsers.get(chatId);
  const userItervals = userConfig?.intervals;

  if (userItervals) {
    if (userItervals.coinListIntervalId) {
      clearInterval(userItervals.coinListIntervalId);
    }
    if (userItervals.coinPricesIntervalId) {
      clearInterval(userItervals.coinPricesIntervalId);
    }
  }
  
  connectedUsers.delete(chatId);

  await ctx.reply(
    `Больше я не буду присылать вам уведомлений 😔`,
    {
      parse_mode: 'MarkdownV2'
    }
  );
});

bot.command('settings', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const { connectedUsers, userStates, coinList} = ctx.session;
  console.log('settings', connectedUsers?.size, connectedUsers);

  // await ctx.reply(`Test data: ${count}, ${connectedUsers.size}`);

  if (!connectedUsers.has(chatId)) {
    return;
  }
    
  userStates.delete(chatId);

  const userConfig = connectedUsers.get(chatId);
  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;

  await ctx.reply(
    getSettingsTitle(lang, Object.keys(coinList).length), 
    {
      parse_mode: 'MarkdownV2',
      reply_markup: getSettingsKeyboard(chatId, ctx.session),
    });
});

bot.callbackQuery('time-interval', async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;
  if (!chatId) return;

  const { connectedUsers, userStates } = ctx.session;

  const userConfig = connectedUsers.get(chatId);
  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;
  const time = userConfig?.botConfig?.time ?? botConfigDefault.time;

  await ctx.callbackQuery.message?.editText(
    getTimeIntervalTitle(lang, time),
    {
      parse_mode: 'MarkdownV2',
    }
  );

  userStates.set(chatId, 'waitTimeInterval');
  
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('percent-change', async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;
  
  const { connectedUsers, userStates } = ctx.session;

  const userConfig = connectedUsers.get(chatId);
  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;
  const percent = userConfig?.botConfig?.percent ?? botConfigDefault.percent;

  await ctx.callbackQuery.message?.editText(
    getPercentTitle(lang, percent),
    {
      parse_mode: 'MarkdownV2',
    }
  );
  
  userStates.set(chatId, 'waitPercent');
    
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('language', async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;

  await ctx.callbackQuery.message?.editText(
    `Текущий язык : ${getLanguageFlag(chatId, ctx.session)}.`,
    {
      reply_markup: chooseLanguage
    }
  );
    
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(languages as unknown as string[], async (ctx) => {
  const newLang = ctx.callbackQuery.data as Language;

  const chatId = ctx.chat?.id ?? -1;
  const { connectedUsers, coinList } = ctx.session;

  const userConfig = connectedUsers.get(chatId);

  connectedUsers.set(chatId, 
    { 
      ...userConfig, 
      botConfig: { 
        ...botConfigDefault,  
        ...userConfig?.botConfig, 
        lang: newLang 
      }
    });


  await ctx.callbackQuery.message?.editText(
    getSettingsTitle(newLang, Object.keys(coinList).length), 
    { 
      parse_mode: 'MarkdownV2',
      reply_markup: getSettingsKeyboard(chatId, ctx.session) 
    });  

  await ctx.answerCallbackQuery();
});

bot.on(':text', async ctx => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  
  const { connectedUsers, userStates } = ctx.session;

  const userConfig = connectedUsers.get(chatId);

  const text = ctx.msg?.text ?? '';

  const state = userStates.get(chatId);

  if (!state) return;

  switch (state) {
    case 'waitTimeInterval':
      const timeInterval = Number(text);
      if (isNaN(timeInterval)) {
        await ctx.reply('Значение должно быть числом.');
      }
      if (timeInterval < 5 || timeInterval > 1440) {
        await ctx.reply('Значение должно больше 5 и меньше 1440.');
      }
      if (timeInterval > 0 ) {
        connectedUsers.set(chatId, 
          { 
            ...userConfig, 
            botConfig: { 
              ...botConfigDefault,  
              ...userConfig?.botConfig, 
              time: timeInterval 
            }
          });

        restartCoinPricesInterval(chatId, ctx.session);

        userStates.delete(chatId);

        await ctx.reply('Успешно! Параметр обновлён.', { reply_markup: backKeyboard });
      }    
      return;
    case 'waitPercent':
      const percent = Number(text);
      if (isNaN(percent)) {
        await ctx.reply('Значение должно быть числом.');
      }
      if (percent <= 0 || percent > 100) {
        await ctx.reply('Значение должно больше 0 и меньше 100.');
      }
      if (percent > 0 ) {
        connectedUsers.set(chatId, 
          { 
            ...userConfig, 
            botConfig: { 
              ...botConfigDefault,  
              ...userConfig?.botConfig, 
              percent
            }
          });

        restartCoinPricesInterval(chatId, ctx.session);
  
        userStates.delete(chatId);
  
        await ctx.reply('Успешно! Параметр обновлён.', { reply_markup: backKeyboard });
      }    
      return;
    default:
      return;
  };
});

bot.callbackQuery('back', async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;
  
  const { connectedUsers, coinList } = ctx.session;

  const userConfig = connectedUsers.get(chatId);
  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;

  await ctx.callbackQuery.message?.editText(
    getSettingsTitle(lang, Object.keys(coinList).length), 
    { 
      parse_mode: 'MarkdownV2',
      reply_markup: getSettingsKeyboard(chatId, ctx.session) 
    });
  await ctx.answerCallbackQuery();
});

bot.catch((err) => console.error('[ Bot error ]', err));

// bot.start();

const getSettingsKeyboard = (chatId: number, session: SessionData) => { 
  const { connectedUsers } = session;

  const userConfig = connectedUsers.get(chatId);
  const time = userConfig?.botConfig?.time ?? botConfigDefault.time;
  const percent = userConfig?.botConfig?.percent ?? botConfigDefault.percent;

  const settingsKeyboard = new InlineKeyboard()
    .text(`Время: ${time} мин.`, 'time-interval')
    .text(`Процент: ${percent}`, 'percent-change')
    .row()
    .text(`Язык ${getLanguageFlag(chatId, session)}`, 'language');

  return settingsKeyboard;
};

const flags = new Map<Language, string>([
  ['by', '🇧🇾'],
  ['ru', '🇷🇺']
]);

const getLanguageFlag = (chatId: number, session: SessionData) => {
  const { connectedUsers } = session;

  const userConfig = connectedUsers.get(chatId);
  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;

  return flags.get(lang);
};


const getCoins = async () => {
  console.log('getCoins');
  try {
    const res = await fetch(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?sort=cmc_rank&limit=300`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': `${process.env.COIN_MARKET_CAP_API_KEY}`
        }
      });

    if (!res.ok) {
      throw new Error(await res.json());  
    }

    const body = await res.json();

    if (body.status.error_code > 0) {
      throw new Error(body.status.error_message);  
    }

    const data: CMC_CoinInfo[] = body.data ?? [];

    const newCoinsList: CoinsList = data
      .reduce((result, coinInfo) => {
        // Берём только то, что торгуется
        if (coinInfo.is_active !== 1) {
          return result;
        }

        result[coinInfo.symbol] = {
          name: coinInfo.name,
          coinName: coinInfo.name
        };
        return result;
      }, {} as CoinsList);

    return { ...newCoinsList };

    // const res = await fetch(`${baseUrl}/all/coinlist`);

    // if (!res.ok) {
    //   throw new Error(await res.json());  
    // }

    // const body = await res.json();

    // if (body.Response === 'Error') {
    //   throw new Error(body.Message);      
    // }

    // const data = body.Data;

    // const newCoinsList: CoinsList = Object
    //   .keys(data)
    //   .reduce((result, key) => {
    //     // Берём только то, что торгуется
    //     if (!data[key].IsTrading) {
    //       return result;
    //     }

    //     // Берём только top-400
    //     if (Number(data[key].SortOrder) > 400) {
    //       return result;
    //     }

    //     result[key] = {
    //       name: data[key].Name,
    //       coinName: data[key].CoinName
    //     };
    //     return result;
    //   }, {} as CoinsList);

    // coinList = { ...newCoinsList };

  } catch (error: any) {
    console.error('[ Get Coins Error ]', error.message);
  }
};

const getCoinPrices = async(chatId: number, session: SessionData) => {
  const { connectedUsers, coinList } = session; 
  try {
    const coinsArray = Object.keys(coinList);
    const portionedCoinsList = coinsArray.reduce((result: string[], value: string) => {
      const lastLine = result[result.length - 1];
      const newValue = (lastLine ? ',' : '') + value;

      if (lastLine?.length + newValue.length <= 300) {
        result[result.length - 1] += newValue;
      } else {
        result.push(value);
      }

      return result;
    }, []);

    const promises = portionedCoinsList.map(async (portion) => {
      const res = await fetch(`${baseUrl}/pricemulti?fsyms=${portion}&tsyms=USD`);

      if (!res.ok) {
        throw new Error(await res.json());  
      }

      const body = await res.json();

      if (body.Response === 'Error') {
        throw new Error(body.Message);      
      }

      return body;
    });

    const result = await Promise.all(promises);

    const currentPrices: { [key: string]: { USD: number }} = result.reduce((res, item) => ({ ...res, ...item }), {});

    const userConfig = connectedUsers.get(chatId);
    const trackedPrices = userConfig?.prices ?? {};

    for (const [coinSymbol, value] of Object.entries(currentPrices)) {
      const prevPrice = trackedPrices[coinSymbol]?.prevPrice;
      const lastPrice = trackedPrices[coinSymbol]?.lastPrice;
      if (!prevPrice) {
        trackedPrices[coinSymbol] = {
          prevPrice: value.USD
        };
        continue;
      }
      if (!lastPrice) {
        trackedPrices[coinSymbol] = {
          prevPrice,
          lastPrice: value.USD
        };
        continue;
      }
      trackedPrices[coinSymbol] = {
        prevPrice: lastPrice,
        lastPrice: value.USD
      };
    }

    connectedUsers.set(chatId, {
      ...userConfig,
      prices: { ...trackedPrices }
    });
    
  } catch (error: any) {
    console.error('[ Get Coin Prices Error ]', error.message);    
  }
};

// const restartCoinListInterval = (chatId: number) => {
//   const userConfig = connectedUsers.get(chatId);

//   let coinListIntervalId = userConfig?.intervals?.coinListIntervalId;
//   if (coinListIntervalId) clearInterval(coinListIntervalId);

//   // Обновляем список монет каждые coinListInterval ms
//   coinListIntervalId = setInterval(() => {
//     getCoins();
//   }, coinListInterval);

//   connectedUsers.set(chatId, {
//     ...userConfig,
//     intervals: {
//       ...userConfig?.intervals,
//       coinListIntervalId
//     }
//   });
// };

const restartCoinPricesInterval = (chatId: number, session: SessionData) => {
  const { connectedUsers } = session;

  const userConfig = connectedUsers.get(chatId);
  const time = userConfig?.botConfig?.time ?? botConfigDefault.time;

  let coinPricesIntervalId = userConfig?.intervals?.coinPricesIntervalId;
  if (coinPricesIntervalId) clearInterval(coinPricesIntervalId);

  // Получаем цены каждые time ms
  coinPricesIntervalId = setInterval(async () => {
    await getCoinPrices(chatId, session);
    await checkPrices(chatId, session);
  }, time * 60 * 1000);

  connectedUsers.set(chatId, {
    ...userConfig,
    intervals: {
      ...userConfig?.intervals,
      coinPricesIntervalId
    }
  });
};

const checkPrices = async (chatId: number, session: SessionData) => {
  const { connectedUsers } = session;

  const userConfig = connectedUsers.get(chatId);
  const percentConfig = userConfig?.botConfig?.percent ?? botConfigDefault.percent;
  const timeConfig = userConfig?.botConfig?.time ?? botConfigDefault.time;
  const trackedPrices = userConfig?.prices ?? {};

  const parseStringToMD = (str: string) => str
    .replaceAll('.', '\\.')
    .replaceAll('+', '\\+')
    .replaceAll('-', '\\-');

  let notification = '';

  for (const [coin, prices] of Object.entries(trackedPrices)) {
    const prevPrice = prices?.prevPrice;
    const lastPrice = prices?.lastPrice;

    if (!prevPrice || !lastPrice) {
      continue;
    }
    
    const percentChange = lastPrice * 100 / prevPrice - 100;
    if (Math.abs(percentChange) >= percentConfig) {
      const isPositive = percentChange > 0;

      // 🔻 🟢 🔴 ↘️ ↗️ 📈 📉 🚀 🩸

      const msg = parseStringToMD(`${isPositive? '📈' : '📉'} *${coin}*\n${isPositive ? '+' : '-'}${Math.abs(Math.round(percentChange))}% за ${timeConfig} мин.\nТекущая цена ${lastPrice}.`);
      if (notification) {
        notification += `\n\n${msg}`;
      } else {
        notification = msg;
      }
    }
  }

  if (notification) {
    bot.api.sendMessage(chatId, notification, { parse_mode: 'MarkdownV2'});
  }
};

getCoins();
// setInterval(() => {
//   getCoins();
// }, coinListInterval);

setInterval(() => {
  console.log('minute Interval');
}, 1 * 60 * 1000);



export const POST = webhookCallback(bot, 'std/http');

