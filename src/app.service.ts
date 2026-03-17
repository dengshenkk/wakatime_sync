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
      
      this.logger.log('WakaTime data fetched successfully');

      const octokit = new Octokit({ auth: githubToken });
      
      // Load existing chartData from Gist to keep continuous history
      let chartData: {
        dates: string[];
        totalSeconds: number[];
        languages: Record<string, number[]>;
      } = {
        dates: [],
        totalSeconds: [],
        languages: {}
      };

      try {
        const gistData = await octokit.rest.gists.get({ gist_id: gistId });
        const existingContent = gistData.data.files?.['wakatime-data.json']?.content;
        if (existingContent) {
          chartData = JSON.parse(existingContent);
          this.logger.log(`Found existing history in Gist with ${chartData.dates.length} days of data. Merging...`);
        }
      } catch (err) {
        this.logger.warn('Could not load existing Gist data (or it is empty). Starting fresh.');
      }

      // Merge new data into existing chartData
      for (const day of data) {
        const dateStr = day.range.date;
        let index = chartData.dates.indexOf(dateStr);
        
        if (index === -1) {
          // New date across history
          chartData.dates.push(dateStr);
          chartData.totalSeconds.push(day.grand_total.total_seconds);
          index = chartData.dates.length - 1;
          
           // Ensure all previously tracked languages have a 0 for this new day to maintain array lengths
           for (const langKey of Object.keys(chartData.languages)) {
             chartData.languages[langKey].push(0);
           }
        } else {
          // Update existing date (if fetched again, it might have more up-to-date hours)
          chartData.totalSeconds[index] = day.grand_total.total_seconds;
          // Zero out languages for this day first before re-populating
          for (const langKey of Object.keys(chartData.languages)) {
            chartData.languages[langKey][index] = 0;
          }
        }

        // Populate new languages metrics
        for (const lang of day.languages) {
          if (!chartData.languages[lang.name]) {
             // A brand new language we've never tracked! Initialize array with length = current dates
             chartData.languages[lang.name] = new Array(chartData.dates.length).fill(0);
          }
          chartData.languages[lang.name][index] = lang.total_seconds;
        }
      }

      const gistContent = JSON.stringify(chartData, null, 2);

      await octokit.rest.gists.update({
        gist_id: gistId,
        files: {
          'wakatime-data.json': {
            content: gistContent
          }
        }
      });

      this.logger.log(`Gist ${gistId} updated. Now tracking ${chartData.dates.length} days of data!`);
      
    } catch (error) {
      this.logger.error('Failed to sync data', error.message);
      if (error.response) {
        this.logger.error(JSON.stringify(error.response.data));
      }
    }
  }
}
