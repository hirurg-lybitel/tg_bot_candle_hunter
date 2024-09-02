import { baseApiUrl } from "@/constants";
import { RequestMethod, TimeInterval } from "@/types";
import { stringToArray } from "cron-converter";
import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = 'https://api.cron-job.org';
const headers = {
  'Authorization': `Bearer ${process.env.CRON_API_KEY}`,
  'Content-Type': 'application/json'
};

const getCronString = ({ type, value }: TimeInterval) => {
  const currentDate = new Date();
  const currenMinute = currentDate.getMinutes();
  const currenHours = currentDate.getHours();
  const currenDay = currentDate.getDate();
  
  switch (type) {
    case 'minutes':
      return `*/${value} * * * *`;
    case 'hours':
      return `${currenMinute} */${value} * * *`;
    case 'days':
      return `${currenMinute} ${currenHours} */${value} * *`;
    case 'months':
      return `${currenMinute} ${currenHours} ${currenDay} */${value} *`;
    default:
      return '0 * * * *';
  }
};

export const POST = async (request: NextRequest) => {
  const { 
    chatId,
    period,
    percent
  } = await request.json();

  const cronString = getCronString(period);
  const schedule = stringToArray(cronString);

  const body = {
    job: {
      url: `${baseApiUrl}/bot`,
      requestMethod: RequestMethod.PUT,
      enabled: true,
      schedule: {
        "timezone": "Europe/Minsk", 
        "expiresAt": 0, 
        "minutes": schedule[0], 
        "hours": schedule[1], 
        "mdays": schedule[2], 
        "months": schedule[3], 
        "wdays":[-1]
      },
      extendedData: {
        body: JSON.stringify({
          chatId,
          percent
        })
      }
    }
  };

  try {
    const response = await fetch(`${ENDPOINT}/jobs`, {
      headers,
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(response.statusText, { status: response.status });
    } 

    const { jobId }  = await response.json();
  
    return NextResponse.json(jobId);
  } catch (error: any) {
    return NextResponse.json(error.message, { status: 500 });
  }
};

export const PATCH  = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  const { 
    chatId,
    period,
    percent
  } = await request.json();

  const cronString = getCronString(period);
  const schedule = stringToArray(cronString);

  console.log('CRON PATCH', { cronString, schedule });

  const body = {
    job: {
      url: `${baseApiUrl}/bot`,
      requestMethod: RequestMethod.PUT,
      enabled: true,
      schedule: {
        "timezone":"Europe/Minsk", 
        "expiresAt":0, 
        "minutes": schedule[0], 
        "hours": schedule[1], 
        "mdays": schedule[2], 
        "months": schedule[3], 
        "wdays":[-1]
      },
      extendedData: {
        body: JSON.stringify({
          chatId,
          percent
        })
      }
    }
  };

  try {
    const response = await fetch(`${ENDPOINT}/jobs/${jobId}`, {
      headers,
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(response.statusText, { status: response.status });
    } 

    const responseData = await response.json();
  
    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json(error.message, { status: 500 });
  }
};

export const DELETE = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  try {
    const response = await fetch(`${ENDPOINT}/jobs/${jobId}`, {
      headers,
      method: 'DELETE',
    });

    if (!response.ok) {
      return NextResponse.json(response.statusText, { status: response.status });
    } 

    const responseData = await response.json();

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json(error.message, { status: 500 });
  }
};