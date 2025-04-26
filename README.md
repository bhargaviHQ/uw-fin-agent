## UW FosterX
A gamified investment simulator that helps users learn to make investment decisions using real-world data, AI recommendations, and virtual trading.

### Project Setup & Configuration

####  Clone the Repository
```bash
git clone https://github.com/bhargaviHQ/uw-fin-agent.git
cd uw-fin-agent
```


#### Set Environment Variables
Before running the project, make sure to set the following environment variables in `.env` file:

``` bash
GOOGLE_GENAI_API_KEY=your-google-api-key
NEWSAPI_KEY=your-newsapi-key
```

Note: You can add them in a .env file or export them directly in your terminal.

Where to get the keys:

Get your Gemini API key from: [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key)

Get your NewsAPI Key from: [NewsAPI Website](https://newsapi.org/)




####  Open terminal to run the following commands : 

- Install Dependencies
```bash
npm install
```

- Run the Project
```bash
npm run dev
```

The app should be running at `http://localhost:9002` (or other port shown in terminal).
