export const dynamic = 'force-dynamic';

export const fetchCache = 'force-no-store';

import { Bot, webhookCallback, InlineKeyboard, Context, session, SessionFlavor } from 'grammy';
import { hydrate, HydrateFlavor } from "@grammyjs/hydrate";
import { freeStorage } from "@grammyjs/storage-free";
import { BotConfig, CMC_CoinInfo, CoinsList, flags, Language, languages, SessionData, TimeInterval, TrackedPrices, UserConfig, UserStates } from '@/types';
import { getLanguageInfo, getNotificationMessage, getPercentInfo, getPercentTitle, getSettingsTitle, getTimeInfo, getTimeIntervalCategoryTitle, getTimeIntervalTitle, parseStringToMD } from './localization';
import { baseApiUrl } from '@/constants';
import { deleteCronJob, setCronJob, updateCronJob } from './cron';
import { NextResponse } from 'next/server';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';

type MyContext = HydrateFlavor<Context> & SessionFlavor<SessionData>;

function initial(): SessionData {
  const userStates = {}; 
  const userConfig = {};

  return {
    userStates, 
    userConfig
  };
}

const cryptoCompareUrl = 'https://min-api.cryptocompare.com/data';

const botConfigDefault: BotConfig = {
  percent: 20,
  lang: 'by',
  interval: {
    type: 'minutes',
    value: 15
  }
};

const coinListInterval = 24 * 60 * 60 * 1000;

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
const botStorage = freeStorage<SessionData>(bot.token);

bot.use(hydrate());
bot.use(session({
  initial,
  storage: botStorage,
}));

bot.command('start', async (ctx) => {
  const userName = ctx.from?.first_name ?? (ctx.from?.language_code === 'en' ? 'User' : 'Пользователь');
  const chatId = ctx.chat.id;

  const { userConfig } = ctx.session;

  const coinList = await getCoins() ?? {};
  const prices = await getCoinPrices(coinList, userConfig.prices);

  const { cronJobId: oldCronJobId } = userConfig;
  if (oldCronJobId) {
    await deleteCronJob(oldCronJobId);
  }

  const cronJobId = await setCronJob({
    chatId,
    percent: botConfigDefault.percent,
    period: botConfigDefault.interval
  });

  if (!cronJobId) {
    console.error('Cron jon was not set');
  }

  Object.assign(userConfig, {
    botConfig: botConfigDefault,
    cronJobId,
    pricesUTF16: compressToUTF16(JSON.stringify(prices)),
    coinListUTF16: compressToUTF16(JSON.stringify(coinList)),
  });

  await ctx.reply(
    `*Добро пожаловать, ${userName}*\\.\n\nТеперь вы подписаны на все памы/дампы\\.\n\nИспользуя команду /settings, вы можете изменить ряд ключевых параметров работы бота\\.`,
    {
      parse_mode: 'MarkdownV2'
    }
  );
});

bot.command('settings', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const { userStates, userConfig } = ctx.session;

  if (Object.keys(userConfig).length === 0) {
    return;
  }

  delete userStates[chatId];

  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;

  const coinList: CoinsList = JSON.parse(decompressFromUTF16(userConfig.coinListUTF16 ?? ''));

  await ctx.reply(
    getSettingsTitle(lang, Object.keys(coinList).length), 
    {
      parse_mode: 'MarkdownV2',
      reply_markup: getSettingsKeyboard(chatId, ctx.session),
    });
});

bot.command('stop', async (ctx) => {
  const { cronJobId } = ctx.session.userConfig;
  if (cronJobId) {
    await deleteCronJob(cronJobId);
  }
  
  ctx.session = initial();

  await ctx.reply(
    `Больше я не буду присылать вам уведомлений 😔`,
    {
      parse_mode: 'MarkdownV2'
    }
  );
});

bot.command('reset', async (ctx) => {
  const { cronJobId } = ctx.session.userConfig;
  if (cronJobId) {
    await deleteCronJob(cronJobId);
  }
  
  ctx.session = initial();
  ctx.reply('Сессия сброшена!');
});

bot.callbackQuery('time-interval', async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;
  if (!chatId) return;

  const { userConfig } = ctx.session;

  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;
  const interval = userConfig?.botConfig?.interval ?? botConfigDefault.interval;

  const optionsKeyboard = new InlineKeyboard()
    .text('Минуты', 'time-interval-minutes')
    .text('Часы', 'time-interval-hours')
    .row()
    .text('Дни', 'time-interval-days')
    .text('Месяцы', 'time-interval-months')
    .row()
    .text('← Назад', 'back');

  await ctx.callbackQuery.message?.editText(
    getTimeIntervalCategoryTitle(lang, interval),
    {
      parse_mode: 'MarkdownV2',
      reply_markup: optionsKeyboard
    }
  );
  
  await ctx.answerCallbackQuery();
});

bot.callbackQuery([
  'time-interval-minutes', 
  'time-interval-hours', 
  'time-interval-days', 
  'time-interval-months'
], async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;
  const category = ctx.callbackQuery.data;

  const { userConfig, userStates } = ctx.session;
  const { lang, interval } = userConfig.botConfig ?? botConfigDefault;

  switch (category) {
    case 'time-interval-minutes':
      userStates[chatId] = 'waitTimeIntervalMinutes';
      break;
    case 'time-interval-hours':
      userStates[chatId] = 'waitTimeIntervalHours';
      break;
    case 'time-interval-days':
      userStates[chatId] = 'waitTimeIntervalDays';
      break;
    case 'time-interval-months':
      userStates[chatId] = 'waitTimeIntervalMonths';
      break;
    default:
      break;
  };

  await ctx.callbackQuery.message?.editText(
    getTimeIntervalTitle(lang, interval),
    {
      parse_mode: 'MarkdownV2'
    }
  );
  await ctx.answerCallbackQuery();
});

bot.callbackQuery('percent-change', async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;
  
  const { userStates, userConfig } = ctx.session;
  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;
  const percent = userConfig?.botConfig?.percent ?? botConfigDefault.percent;

  await ctx.callbackQuery.message?.editText(
    getPercentTitle(lang, percent),
    {
      parse_mode: 'MarkdownV2',
    }
  );
  
  userStates[chatId] = 'waitPercent';
    
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
  const { userConfig } = ctx.session;

  const coinList: CoinsList = JSON.parse(decompressFromUTF16(userConfig.coinListUTF16 ?? ''));


  Object.assign(userConfig, {
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
  
  const { userStates, userConfig } = ctx.session;

  const text = ctx.msg?.text ?? '';

  const state = userStates[chatId];
  if (!state) return;

  switch (state) {
    case 'waitTimeIntervalMinutes':
    case 'waitTimeIntervalHours':
    case 'waitTimeIntervalDays':
    case 'waitTimeIntervalMonths':
      const timeInterval = Number(text);
      if (!Number.isInteger(timeInterval)) {
        return await ctx.reply('Значение должно быть целым числом.');
      }

      if (state === 'waitTimeIntervalMinutes' && (timeInterval < 5 || timeInterval > 30)) {
        return await ctx.reply('Значение должно быть от 5 до 30.');
      }
      if (state === 'waitTimeIntervalHours' && (timeInterval < 1 || timeInterval > 12)) {
        return await ctx.reply('Значение должно быть от 1 до 12.');
      }
      if (state === 'waitTimeIntervalDays' && (timeInterval < 1 || timeInterval > 31)) {
        return await ctx.reply('Значение должно быть от 1 до 31.');
      }
      if (state === 'waitTimeIntervalMonths' && (timeInterval < 1 || timeInterval > 12)) {
        return await ctx.reply('Значение должно быть от 1 до 12.');
      }

      const newInterval: TimeInterval = {
        value: timeInterval,
        type: (() => {
          switch (state) {
            case 'waitTimeIntervalMinutes':
              return 'minutes';
            case 'waitTimeIntervalHours':
              return 'hours';
            case 'waitTimeIntervalDays':
              return 'days';
            case 'waitTimeIntervalMonths':
              return 'months';                
            default:
              return 'minutes';
          }
        })()
      };

      if (timeInterval > 0 ) {
        Object.assign(userConfig, {
          ...userConfig,
          botConfig: { 
            ...botConfigDefault,  
            ...userConfig?.botConfig, 
            interval: newInterval 
          }
        });

        if (userConfig.cronJobId) {
          await updateCronJob(userConfig.cronJobId, { 
            chatId, 
            period: newInterval, 
            percent: userConfig.botConfig?.percent ?? botConfigDefault.percent
          });
        }

        delete userStates[chatId];

        await ctx.reply('Успешно! Параметр обновлён.', { reply_markup: backKeyboard });
      }    
      return;
    case 'waitPercent':
      const percent = Number(text);
      if (!Number.isInteger(percent)) {
        return await ctx.reply('Значение должно быть целым числом.');
      }
      if (percent <= 0 || percent > 100) {
        return await ctx.reply('Значение должно больше 0 и меньше 100.');
      }
      if (percent > 0 ) {
        Object.assign(userConfig, {
          ...userConfig,
          botConfig: { 
            ...botConfigDefault,  
            ...userConfig?.botConfig, 
            percent
          }
        });

        if (userConfig.cronJobId) {
          await updateCronJob(userConfig.cronJobId, { 
            chatId, 
            period: userConfig.botConfig?.interval ?? botConfigDefault.interval, 
            percent 
          });
        }
  
        delete userStates[chatId];
  
        await ctx.reply('Успешно! Параметр обновлён.', { reply_markup: backKeyboard });
      }    
      return;
    default:
      return;
  };
});

bot.callbackQuery('back', async (ctx) => {
  const chatId = ctx.chat?.id ?? -1;
  
  const { userConfig } = ctx.session;

  const coinList: CoinsList = JSON.parse(decompressFromUTF16(userConfig.coinListUTF16 ?? ''));
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

const getSettingsKeyboard = (chatId: number, session: SessionData) => { 
  const { userConfig } = session; 
  const { lang, interval, percent } = userConfig.botConfig ?? botConfigDefault;

  const settingsKeyboard = new InlineKeyboard()
    .text(getTimeInfo(lang, interval), 'time-interval')
    .text(getPercentInfo(lang, percent), 'percent-change')
    .row()
    .text(getLanguageInfo(lang, getLanguageFlag(chatId, session)), 'language');

  return settingsKeyboard;
};

const getLanguageFlag = (chatId: number, session: SessionData) => {
  const { userConfig } = session;
  const lang = userConfig?.botConfig?.lang ?? botConfigDefault.lang;

  return flags.get(lang) ?? '';
};


const getCoins = async (): Promise<CoinsList | undefined> => {
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

    // const res = await fetch(`${cryptoCompareUrl}/all/coinlist`);

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

const getCoinPrices = async(
  coinList: CoinsList, 
  trackedPrices: TrackedPrices = {}
) => {
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
      const response = await fetch(`${cryptoCompareUrl}/pricemulti?fsyms=${portion}&tsyms=USD`);

      if (!response.ok) {
        throw new Error(await response.json());  
      }

      const body = await response.json();

      if (body.Response === 'Error') {
        throw new Error(body.Message);      
      }

      return body;
    });

    const result = await Promise.all(promises);

    const currentPrices: { [key: string]: { USD: number }} = result.reduce((res, item) => ({ ...res, ...item }), {});

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

    return trackedPrices;
    
  } catch (error: any) {
    console.error('[ Get Coin Prices Error ]', error.message);    
  }
};


const checkPrices = async (
  interval: TimeInterval,
  percent: number,
  trackedPrices: TrackedPrices,
  lang: Language
): Promise<string> => {
  let notification = '';

  for (const [coin, prices] of Object.entries(trackedPrices)) {
    const prevPrice = prices?.prevPrice;
    const lastPrice = prices?.lastPrice;

    if (!prevPrice || !lastPrice) {
      continue;
    }
    
    const percentChange = lastPrice * 100 / prevPrice - 100;
    if (Math.abs(percentChange) >= percent) {      
      // 🔻 🟢 🔴 ↘️ ↗️ 📈 📉 🚀 🩸
      const msg = getNotificationMessage(lang, coin, Math.round(percentChange), interval, lastPrice);
      if (notification) {
        notification += `\n\n${msg}`;
      } else {
        notification = msg;
      }
    }
  }

  return notification;
};


// bot.start();

export const POST = webhookCallback(bot, 'std/http');

export const GET = async () => { 
  return Response.json('GET Request From SERVER');
};

export const PUT = async (request: Request) => {
  const {
    chatId,
    percent
  } = await request.json();
  const storage = await botStorage.read(chatId);
  const { userConfig } = storage;

  const coinList: CoinsList = JSON.parse(decompressFromUTF16(userConfig.coinListUTF16 ?? ''));
  const prices: TrackedPrices = JSON.parse(decompressFromUTF16(userConfig.pricesUTF16 ?? ''));

  const interval: TimeInterval = userConfig.botConfig?.interval ?? botConfigDefault.interval;
  const lang = userConfig.botConfig?.lang ?? botConfigDefault.lang;


  const newPrices = await getCoinPrices(coinList, prices) ?? {};
 
  botStorage.write(chatId, {
    ...storage,
    userConfig: {
      ...storage.userConfig,
      pricesUTF16: compressToUTF16(JSON.stringify(newPrices))
    }
  });

  const notification = await checkPrices(interval, percent, newPrices, lang);
  if (notification) {
    bot.api.sendMessage(chatId, notification, { parse_mode: 'MarkdownV2' });
  }
  
  return NextResponse.json('PUT Request From SERVER');
};


// https://api.telegram.org/bot7359317429:AAFMkIhFeJc-_d4645qNUA2cVJeRMVIBjRU/sendMessage?chat_id=6263165398&text=1

// https://api.telegram.org/bot7359317429:AAFMkIhFeJc-_d4645qNUA2cVJeRMVIBjRU/getWebhookInfo
// https://api.telegram.org/bot7359317429:AAFMkIhFeJc-_d4645qNUA2cVJeRMVIBjRU/setWebhook?url=https://tg-bot-candle-hunter.vercel.app/api/bot&drop_pending_updates=True
// https://api.telegram.org/bot7359317429:AAFMkIhFeJc-_d4645qNUA2cVJeRMVIBjRU/setWebhook?remove