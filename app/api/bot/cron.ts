import { baseApiUrl } from "@/constants";
import { TimeInterval } from "@/types";

export const setCronJob = async ({ 
  chatId,
  period,
  percent
}: {
    chatId: number;
    period: TimeInterval;
    percent: number;
  }): Promise<number | undefined> => {
  try {
    const response = await fetch(`${baseApiUrl}/cron`, {
      method: 'POST',
      body: JSON.stringify({
        chatId,
        period,
        percent
      })
    }); 
    return await response.json();
  } catch (error: any) {
    console.error(`[ POST Cron Job ]`, error.message);
  }
};
  
export const updateCronJob = async (
  jobId: number, { 
    chatId,
    period,
    percent
  }: {
    chatId: number;
    period: TimeInterval;
    percent: number;
  }) => {
  try {
    const response = await fetch(`${baseApiUrl}/cron?jobId=${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        chatId,
        period,
        percent
      })
    });
     
    return response.ok;
  } catch (error: any) {
    console.error(`[ UPDATE Cron Job ]`, error.message);
  }
};
  
export const deleteCronJob = async (jobId: number) => {
  try {
    const response = await fetch(`${baseApiUrl}/cron?jobId=${jobId}`, {
      method: 'DELETE'
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw responseData;
    } 

    return true;
    
  } catch (error: any) {
    console.error(`[ DELETE Cron Job ]`, error.message);
  }
};