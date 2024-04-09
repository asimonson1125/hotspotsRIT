def getCoordArray(ref):
    try:
        ref.properties.reference
    except:
        return ref
    coords = None
    try:
        coords = ref.properties.reference.getLatLng()
    except:
        coords = ref.properties.reference.getBounds().getCenter()
    return [coords.lat, coords.lng]

def calcDistances(nodes):
    # Used in initialization to calculate the distance between nodes
    pass
    setSpace(nodes)

space_coords = [43.09224, -77.674799];
UC_coords = [43.080361, -77.683296];
perkins_coords = [43.08616, -77.661796];
def setSpace(nodes):
    # Sets the default void for each node based on proximity
    for i in nodes:
        centroid = getCoordArray(i)
        if centroid[1] > -77.673157:
            i.properties.space = perkins_coords
        elif centroid[1] < -77.677503 and centroid[0] < 43.08395:
            i.properties.space = UC_coords
        else:
            i.properties.space = space_coords

def calculateShotsFromCache(cache):
    shots = {}
    for interval in range(len(cache)-1):
        previous = cache[interval]
        current = cache[interval+1]
        pass
        shotlist = ""
        for shot in shotlist:
            pass
