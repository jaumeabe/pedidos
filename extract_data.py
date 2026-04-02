import pandas as pd
import json

pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.width', 300)
pd.set_option('display.max_colwidth', 200)

filepath = r'C:\Users\jaumejr\Documents\GitHub\Pedidos\LISTADO MEDICAMENTOS MATERIAL.xls'
output = r'C:\Users\jaumejr\Documents\GitHub\Pedidos\xls_full_output.json'

try:
    sheets = pd.read_excel(filepath, sheet_name=None, header=None)
except Exception:
    sheets = pd.read_excel(filepath, sheet_name=None, header=None, engine='xlrd')

result = {}
for name, df in sheets.items():
    rows = []
    for i, row in df.iterrows():
        vals = [str(v) if pd.notna(v) else '' for v in row]
        rows.append(vals)
    result[name] = rows

with open(output, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=1)

print(f"Done. Written to {output}")
