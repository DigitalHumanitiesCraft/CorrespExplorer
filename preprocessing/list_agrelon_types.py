import xml.etree.ElementTree as ET

tree = ET.parse('c:/Users/Chrisi/Documents/GitHub/HerData/data/SNDB/nsl_agrelon.xml')
root = tree.getroot()

print('AGRELON Types in SNDB:\n')
print(f'{"ID":6s} | {"Category":30s} | Type')
print('-' * 80)

items = []
for item in root.findall('ITEM'):
    ident = item.find('IDENT').text
    kat = item.find('KATEGORIE').text if item.find('KATEGORIE') is not None else 'N/A'
    bez = item.find('BEZIEHUNG').text if item.find('BEZIEHUNG') is not None else 'N/A'
    items.append((ident, kat, bez))

for ident, kat, bez in sorted(items, key=lambda x: x[0]):
    print(f'{ident:6s} | {kat:30s} | {bez}')
