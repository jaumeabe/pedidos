import pandas as pd
pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)
sheets = pd.read_excel(r'C:/Users/jaumejr/Documents/GitHub/Pedidos/LISTADO MEDICAMENTOS MATERIAL.xls', sheet_name=None)
for name, df in sheets.items():
    print(f'=== Sheet: {name} ===')
    print(f'Shape: {df.shape}')
    print(df.to_string())
    print()
