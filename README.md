## Description
Javascript/node.js example of Nextbillion.ai travel/distance matrix calculation API using Flatbuffer endpoint. 
- random set of lat/lon pairs within a defined polygon
- default number of points generated id 24
- default endpoint is a local instance of nextbillion.ai stack

## Quick Start
- install Flatbuffers `brew install flatbuffer`
- install TypeScript transpiler `brew install tsc`
- compile the nextbillion.ai schema to generate TypeScript files `flatc --ts nbai_fbschema.fbs`
-`npm install`
- transpile TS to JS `tsc nbai/*.ts`
- `node index.js`
- output to console is the response time distance grid 

## API documentation
[https://doc.maps.nextbillion.io/api_reference/]

## Questions
jim.welch@nextbillion.ai