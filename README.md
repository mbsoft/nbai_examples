# API documentation
[https://doc.maps.nextbillion.io/api_reference/]

# Distance Matrix
![Alt text](./screenshot.png "Screenshot")
## Description
Javascript/node.js example of Nextbillion.ai travel/distance matrix calculation API using Flatbuffer, Protobuf, and JSON endpoints. 
- random set of lat/lon pairs within a defined polygon
- default number of points generated id 24
- default endpoint is a local instance of nextbillion.ai stack

## Quick Start
- install Flatbuffers `brew install flatbuffer`
- install Protobuf `brew install protobuf`
- install TypeScript transpiler `brew install tsc`
- compile the nextbillion.ai schema to generate TypeScript files `flatc --ts nbai_fbschema.fbs`
- compile the protobuf definition to JavaScript `protoc --proto_path=. --js_out=library=nbai_pb/matrix,binary:build/gen  nbai_protos.proto`
- `npm install`
- transpile TS to JS `tsc build/gen/nbai_fb/*.ts`
- `node distmatrix_json.js` or `node distmatrix_fb.js` `node distmatrix_pb.js`
- output to console is the time distance grid and the size of the response



## Questions
jim.welch@nextbillion.ai