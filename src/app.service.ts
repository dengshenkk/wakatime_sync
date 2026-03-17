import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Octokit } from '@octokit/rest';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  async executeSync() {
    this.logger.log('Starting daily Wakatime sync...');

    const wakatimeKey = process.env.WAKATIME_API_KEY;
    const githubToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    const gistId = process.env.GIST_ID;

    if (!wakatimeKey || !githubToken || !gistId) {
      this.logger.error('Missing required environment variables (WAKATIME_API_KEY, GH_TOKEN/GITHUB_TOKEN, GIST_ID)');
      return;
    }

    try {
      // Fetch data for the last 7 days as an example
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const startDate = lastWeek.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      this.logger.log(`Fetching WakaTime data from ${startDate} to ${endDate}`);

      const wakaUrl = `https://wakatime.com/api/v1/users/current/summaries?start=${startDate}&end=${endDate}`;
      
      const wakaResponse = await axios.get(wakaUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(wakatimeKey).toString('base64')}`
        }
      });
      
      const data = wakaResponse.data.data;
      
      // We will parse the summaries to build data for our charts
      const chartData: {
        dates: string[];
        totalSeconds: number[];
        languages: Record<string, number[]>;
      } = {
        dates: [],
        totalSeconds: [],
        languages: {}
      };

      for (const day of data) {
        chartData.dates.push(day.range.date);
        chartData.totalSeconds.push(day.grand_total.total_seconds);
        
        for (const lang of day.languages) {
          if (!chartData.languages[lang.name]) {
            chartData.languages[lang.name] = new Array(data.length).fill(0);
          }
          chartData.languages[lang.name][chartData.dates.length - 1] = lang.total_seconds;
        }
      }

      this.logger.log('WakaTime data fetched successfully');

      // Update Gist
      const octokit = new Octokit({ auth: githubToken });
      
      const gistContent = JSON.stringify(chartData, null, 2);

      await octokit.rest.gists.update({
        gist_id: gistId,
        files: {
          'wakatime-data.json': {
            content: gistContent
          }
        }
      });

      this.logger.log(`Gist ${gistId} updated successfully with new data!`);
      
    } catch (error) {
      this.logger.error('Failed to sync data', error.message);
      if (error.response) {
        this.logger.error(JSON.stringify(error.response.data));
      }
    }
  }
}
