def build_folder_tree(folders):
    
    nodes = {}
    for f in folders:
        nodes[f.id] = {
            "id": f.id,
            "name": f.name,
            "parent_id": f.parent_id,
            "children": [],  
        }

    
    roots = []
    for f in folders:
        node = nodes[f.id]
        pid = f.parent_id

        if pid is None or pid not in nodes:
            roots.append(node)
        else:
            nodes[pid]["children"].append(node)

    return roots