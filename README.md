# Sample shop app using FaunaDB
### Bootstrapping
* run `npm i`
* copy `.env.sample` as `.env` and fill up `FAUNA_SECRET_KEY` property with your own FaunaDB server key
* run `npm run bootstrap` to initialize FaunaDB structures like collections, indexes
* run `npm start` to start a service
* open swagger documentation at <http://localhost:3000/docs>
