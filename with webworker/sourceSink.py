import requests
from math import sqrt, pow
import json

def getCoordArray(ref):
    coords = ref['geometry']['coordinates']
    if len(coords) == 1:
        coords = coords[0][0] # TODO: Instead of using first edge point of polygons (as we are here), get centroid
    return coords

def calcDistances(input):
    # Used in initialization to calculate the distance between nodes
    nodes = json.loads(json.dumps(input))
    usedNodes = []
    usedNodesDict = {}
    nodeDict = ritCustomize(nodes)
    locations = requests.get("https://maps.rit.edu/proxySearch/locations.search.php").json()
    for loc in locations:
        if loc['properties']['mdo_id'] in nodeDict:
            nodeDict[loc['properties']['mdo_id']]['geometry'] = loc['geometry']
    for i in nodeDict:
        if "geometry" in nodeDict[i]: usedNodes.append(nodeDict[i])
    usedNodes = setSpace(usedNodes)
    
    # Calc distances between nodes:
    for i in usedNodes:
        i['distances'] = {}
        coords1 = getCoordArray(i)
        for x in usedNodes:
            coords2 = getCoordArray(x)
            i['distances'][x['mdo_id']] = sqrt(pow(coords1[0] - coords2[0], 2) + pow(coords1[1] - coords2[1], 2))
        i['distances'].pop(i['mdo_id'])
        i['distances'] = {k: v for k, v in sorted(i['distances'].items(), key=lambda item: item[1])}
        usedNodesDict[i['mdo_id']] = i
    
    return usedNodesDict

no_coords = {
  "Library_A_Level": { "type": "Point", "coordinates": [-77.676355, 43.083974] },
  "Library_1st_Floor": { "type": "Point", "coordinates": [-77.676355, 43.083874] },
  "Library_2nd_Floor": { "type": "Point", "coordinates": [-77.676355, 43.083774] },
  "Library_3rd_Floor": { "type": "Point", "coordinates": [-77.676355, 43.083674] },
  "Library_4th_Floor": { "type": "Point", "coordinates": [-77.676355, 43.083574] },
  "Ross_Hall": { "type": "Point", "coordinates": [-77.677937, 43.082379] },
  "Gordon_Field_House": { "type": "Point", "coordinates": [-77.671725, 43.085149] },
  "Golisano_Institute_for_Sustainability_Lobby": {
    "type": "Point",
    "coordinates": [-77.681365, 43.085376],
  },
  "Beanz": { "type": "Point", "coordinates": [-77.66904, 43.083876]}
};
def ritCustomize(input):
    # Had to make some changes cuz api is funky
    nodeDict = {}
    badOnes = [166]; # Nathan's (166) is a duplicate of Ben and Jerry's
    for i in range(len(input)-1, -1, -1):
        if input[i]['mdo_id'] in badOnes or (input[i]['mdo_id'] == None and not (input[i]['location'] in no_coords)):
            input.pop(i)
            continue
        if input[i]['location'] in no_coords:
            input[i]['geometry'] = no_coords[input[i]['location']]
            input[i]['mdo_id'] = input[i]['location']
        if input[i]['mdo_id'] == None:
            input[i]['mdo_id'] = input[i]['location']
        nodeDict[str(input[i]['mdo_id'])] = input[i]
        
    return nodeDict

# space_coords = [43.09224, -77.674799];
# UC_coords = [43.080361, -77.683296];
# perkins_coords = [43.08616, -77.661796];
def setSpace(nodes):
    # Sets the default void for each node based on proximity
    for i in nodes:
        centroid = getCoordArray(i)
        if centroid[0] > -77.673157:
            i['space'] = 'perkins_coords'
        elif centroid[0] < -77.677503 and centroid[1] < 43.08395:
            i['space'] = 'UC_coords'
        else:
            i['space'] = 'space_coords'
    return nodes

def getShotTarget(nodeDict, sourceNode):
    for nearestNode in nodeDict[sourceNode]['distances']:
        if nodeDict[nearestNode]['diff'] > 0:
            return nearestNode
    return None

def logShot(shots, source, target, shotcount=1):
    shotcount = abs(shotcount)
    if not source in shots.keys(): shots[source] = {}
    if target in shots[source].keys(): shots[source][target] += shotcount
    else: shots[source][target] = shotcount

def calculateShotsFromCache(current, previous, nodes, cachedShots):
    # Start by resetting node differences to 0
    for i in nodes:
        nodes[i]['diff'] = 0
    
    shots = {}
    # Get this interval's shots
        # Start by getting the occupancy difference
    for i in range(len(current)):
        ref = False
        if current[i]['mdo_id'] in nodes:
            ref = nodes[current[i]['mdo_id']]
        elif current[i]['location'] in nodes:
            ref = nodes[current[i]['location']]
        if ref:
            ref['diff'] = current[i]['count'] - previous[i]['count']
        
    pass
    sorted_nodes = sorted(nodes.values(), key=lambda item: -item['diff'])
    
        # Then shift until the differences are gone
    while sorted_nodes[0]['diff'] > 0 and sorted_nodes[-1]['diff'] < 0:
        # Find target
        source = sorted_nodes[-1]['mdo_id']
        target = getShotTarget(nodes, source)
        
        # Log shot occurence
        logShot(shots, source, target)
        
        # adjust owed difference
        nodes[source]['diff'] += 1
        nodes[target]['diff'] -= 1
        
        # resort by owed count
        sorted_nodes = sorted(nodes.values(), key=lambda item: item['diff'])
    
    # difference in campus occupancy comes from space
    for node in reversed(sorted_nodes):
        # Log shots to space
        if node['diff'] <= 0: break
        else:
            logShot(shots, node['space'], node['mdo_id'], node['diff'])
    for node in sorted_nodes:
        # Log shots from space
        if node['diff'] >= 0: break
        else:
            logShot(shots, node['mdo_id'], node['space'], node['diff'])
    
    cachedShots += [shots]
    try:
        cachedShots = cachedShots[-12] # Keep only the last 12 intervals
    except: pass
    
    sumOfCached = {}
    for interval in cachedShots:
        for source, targets in interval.items():
            for target, scale in targets.items():
                logShot(sumOfCached, source, target, scale)
    return sumOfCached, cachedShots
