import * as clientStore from "@silverbulletmd/plugos-silverbullet-syscall/clientStore";
import {getCurrentPage, hideLhs, showLhs} from "@silverbulletmd/plugos-silverbullet-syscall/editor";
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
    await hideLhs()
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
  const allLinks = await queryPrefix(`pl:`);
  // FIXME: This has one remaining issues:
  // 1. Doesn't create nodes for pages without inlinks and outlinks
  const network = allLinks.reduce( (acumulator, {key, page}) => {
    const [,to, ] = key.split(':'); // Key: pl:page:pos
    let outlinks = acumulator.get(page) || [];
    if (!outlinks.includes(to)) outlinks.push(to); // I tried Set<String> ... quite hard.
    if (!acumulator.has(to)) acumulator.set(to, []); // Make sure we add a node for pages with only inlinks
    return acumulator.set(page, outlinks);
  }, new Map<String, Array<String>>())


  let nodes = [];
  let links = [];
  for (let key of network.keys()) {
    if (key === name) nodes.push({ "id": key, "selected": true });
    else nodes.push({ "id": key });
    (network.get(key) || []).forEach( (e) => { links.push({ "source": key, "target": e }); })
  }

  return { "nodes": nodes, "links": links };
}
