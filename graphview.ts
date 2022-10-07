import * as clientStore from "@silverbulletmd/plugos-silverbullet-syscall/clientStore";
import {getCurrentPage, hideLhs, showLhs} from "@silverbulletmd/plugos-silverbullet-syscall/editor";
import { listPages } from "@silverbulletmd/plugos-silverbullet-syscall/space";
import { queryPrefix } from "@silverbulletmd/plugos-silverbullet-syscall";

// @ts-ignore
import d3js from "./lib/d3.js.txt"
// @ts-ignore
import d3forcejs from "./lib/d3-force.js.txt"
// @ts-ignore
import d3forcegraph from "./src/force-graph.js.txt"

const GraphViewKey = "showGraphView"

export async function toggleGraphView() {
  const showingGraphView = (await getGraphViewStatus());
  await clientStore.set(GraphViewKey, !showingGraphView);
  if (!showingGraphView) {
    const name = await getCurrentPage(); 
    await renderGraph(name);
  } else {
    await hideLhs();
  }
}

// Use store to figure out if backlinks are open or closed.
async function getGraphViewStatus() : Promise<boolean> {
  return !!(await clientStore.get(GraphViewKey));
}

function script(graph) {
  return `
    ${d3js}
    ${d3forcejs}
    ${d3forcegraph}
    
    const graph = ${graph};
    console.log(graph);
    const chart = ForceGraph(graph, {
      nodeId: d => d.id,
      nodeTitle: d => d.id,
      nodeRadius: 10,
      height: 600,
      width: 600,
    });
    const graph_div = document.querySelector('#graph');
    graph_div.appendChild(chart);
  `
}

// render function into the LHS
async function renderGraph(page) {
  // https://github.com/d3/d3-force
  const graph = await buildGraph(page);
  const graph_json = JSON.stringify(graph);
  if (await getGraphViewStatus()) {
    await showLhs(
      `<html>
        <head>
        </head>
        <body>
          <h2>Document Graph</h2>
          <div id="graph" >
          </div>
        </body>
      </html>`,
      script(graph_json), // Script (java script as string)
      0.5
    );
  }
}

async function buildGraph(name) {
  const pages = await listPages();
  const nodeNames = pages.map(({name}) => { return name; });

  // NOTE: This may result to the same link showing multiple times
  //       if the same page has multiple references to another page.
  const pageLinks = await queryPrefix(`pl:`);
  const links =  pageLinks.map(({key, page}) => { 
    const [,to, ] = key.split(':'); // Key: pl:page:pos
    
    if (!nodeNames.includes(to)) {
      // Add nodes for non-existing pages which are linked to
      nodeNames.push(to);
    }
    return { "source": page, "target": to };
  });

  const nodes = nodeNames.map((name) => {
    return {"id":name}
  });

  return { "nodes": nodes, "links": links };
}
