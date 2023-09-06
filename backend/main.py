# Importing flask module in the project is mandatory
# An object of Flask class is our WSGI application.
from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS
import json
from datetime import datetime
from collections import defaultdict
from itertools import combinations
import warnings
from pandas.core.common import SettingWithCopyWarning
warnings.simplefilter(action="ignore", category=SettingWithCopyWarning)

gps_data_original = pd.read_csv("../data/gps.csv")
gps_data_original['Timestamp'] = pd.to_datetime(gps_data_original['Timestamp'])
gps_data_original['lat'] = gps_data_original.astype({'lat':'float'})['lat']
gps_data_original['long'] = gps_data_original.astype({'long':'float'})['long']

gps_with_stop_data = pd.read_json("../data/gpswithstop.json")

stops = pd.DataFrame()
for i in range(len(gps_with_stop_data)):
    stops = pd.concat([stops, pd.DataFrame(gps_with_stop_data['stopArr'][i])]).reset_index(drop=True)

stops['st'] = pd.to_datetime(stops['st'])
stops['et'] = pd.to_datetime(stops['et'])
stops['id'] = stops.astype({'id':'float'})['id']
stops['lat'] = stops.astype({'lat':'float'})['lat']
stops['long'] = stops.astype({'long':'float'})['long']

all_ids = [i for i in range(1,36)]+[101,104,105,106,107]

building_coordinates = pd.read_json("../data/building_coordinates.json", encoding='utf-8')
building_coordinates = building_coordinates.loc[building_coordinates['type']!='home']

building_coordinates['left_x'] = [0.0 for _ in range(len(building_coordinates))]
building_coordinates['right_x'] = [0.0 for _ in range(len(building_coordinates))]
building_coordinates['bottom_y'] = [0.0 for _ in range(len(building_coordinates))]
building_coordinates['top_y'] = [0.0 for _ in range(len(building_coordinates))]

for i in range(len(building_coordinates)):
    building_coordinates['left_x'][i] = building_coordinates['range'][i][0][0]
    building_coordinates['right_x'][i] = building_coordinates['range'][i][1][0]
    building_coordinates['bottom_y'][i] = building_coordinates['range'][i][1][1]
    building_coordinates['top_y'][i] = building_coordinates['range'][i][0][1]

stops['location'] = ['' for _ in range(len(stops))]

for i in range(len(stops)):
    for j in range(len(building_coordinates)):
        if building_coordinates['left_x'][j]<=stops['long'][i]<=building_coordinates['right_x'][j] and building_coordinates['bottom_y'][j]<=stops['lat'][i]<=building_coordinates['top_y'][j]:
            stops['location'][i] = building_coordinates['name'][j]


cc_dat_original  = pd.read_csv('../data/cc_data.csv', encoding='cp1252')
loyalty_dat_original = pd.read_csv('../data/loyalty_data.csv', encoding='cp1252')
car = pd.read_csv('../data/car-assignments.csv', encoding='cp1252')

cc_dat_original ['timestamp'] = pd.to_datetime(cc_dat_original ['timestamp'])
cc_dat_original ['date'] = cc_dat_original['timestamp'].dt.date
loyalty_dat_original['timestamp'] = pd.to_datetime(loyalty_dat_original['timestamp'])
loyalty_dat_original ['date'] = loyalty_dat_original['timestamp'].dt.date

car['name'] = car['FirstName'] + ' ' + car['LastName']
car = car.rename(columns={"CarID": "id"})  # rename id for join df purpose

# Flask constructor takes the name of
# current module (__name__) as argument.
app = Flask(__name__)
CORS(app)

# The route() function of the Flask class is a decorator,
# which tells the application which URL should call
# the associated function.
@app.route('/')
# ‘/’ URL is bound with hello_world() function.
def hello_world():
    return 'Hello World'

@app.route("/symbol_map", methods=['POST'])
def symbol_map_data():
    data = json.loads(request.data)

    start_date = datetime.strptime(data['start_date'], "%Y-%m-%d %H:%M:%S")
    end_date = datetime.strptime(data['end_date'], "%Y-%m-%d %H:%M:%S")

    x = pd.DataFrame()
    resp = {}

    for i in all_ids:
        stop_data = pd.DataFrame(gps_with_stop_data.loc[gps_with_stop_data['id']==i].iloc[0]['stopArr'])
        stop_data['st'] = pd.to_datetime(stop_data['st'])
        # stop_data['et'] = pd.to_datetime(stop_data['et'])
        stop_data = stop_data.loc[stop_data['st']>=start_date].loc[stop_data['st']<=end_date]


        x = pd.concat([x, stop_data], axis=0)

    for i in range(len(building_coordinates)):
        y = building_coordinates.iloc[i]
        d = defaultdict(lambda: 0)
        resp[y['name']] = [y['range'], d]

    for i in range(len(x)):
        y = x.iloc[i]
        for j in range(len(building_coordinates)):
            rec = building_coordinates.iloc[j]
            if float(y['long'])>=rec['range'][0][0] and float(y['long'])<=rec['range'][1][0] and float(y['lat'])<=rec['range'][0][1] and float(y['lat'])>=rec['range'][1][1]:
                # print(y['long'], y['lat'])
                # print(rec['range'])
                resp[rec['name']][1][y['id']] += 1

    # print(resp)


    return json.dumps(resp)
    # return gps_data.loc[gps_data['Timestamp']>=start_date].loc[gps_data['Timestamp']<=end_date].to_json(orient='records', date_format='iso')

@app.route("/route_map", methods=['POST'])
def route_map_data():

    global gps_data_original, stops

    data = json.loads(request.data)
    start_date = datetime.strptime(data['start_date'], "%Y-%m-%d %H:%M:%S")
    end_date = datetime.strptime(data['end_date'], "%Y-%m-%d %H:%M:%S")

    resp = []

    for i in all_ids:
        data = gps_data_original.loc[gps_data_original['id']==i]
        stop_data = stops.loc[stops['id']==i]

        # data['Timestamp'] = pd.to_datetime(data['Timestamp'])
        # stop_data['st'] = pd.to_datetime(stop_data['st'])
        # stop_data['et'] = pd.to_datetime(stop_data['et'])

        data = data.loc[data['Timestamp']>=start_date].loc[data['Timestamp']<=end_date]
        stop_data = stop_data.loc[stop_data['st']>=start_date].loc[stop_data['st']<=end_date]


        resp.append({"id":i, "data": json.loads(data.to_json(orient='records', date_format='iso')), "stopArr": json.loads(stop_data.to_json(orient='records', date_format='iso'))})

    # print(resp)
    return json.dumps(resp)

## Stacked bar chart backend function
@app.route("/stacked_bar", methods=['POST'])
def stacked_bar_data():
    ## this function returns a csv (malin_aggregation.csv) for stacked bar chart.
    data = json.loads(request.data)
    start_date = datetime.strptime(data['start_date'], "%Y-%m-%d %H:%M:%S")
    end_date = datetime.strptime(data['end_date'], "%Y-%m-%d %H:%M:%S")

    global cc_dat_original , loyalty_dat_original

    ## select data points based on timestamps from frontend
    cc_dat = cc_dat_original .loc[cc_dat_original ['timestamp']>=start_date].loc[cc_dat_original ['timestamp']<=end_date]
    loyalty_dat = loyalty_dat_original.loc[loyalty_dat_original['timestamp']>=start_date].loc[loyalty_dat_original['timestamp']<=end_date]

    ## Aggregate these two data file so that location has the number of credit card and loyalty card transactions
    cc_agg_dat = cc_dat['location'].value_counts().reset_index()
    cc_agg_dat.columns = ['location', 'n_cc_transactions']

    loyalty_agg_dat = loyalty_dat['location'].value_counts().reset_index()
    loyalty_agg_dat.columns = ['location', 'n_loyaltyc_transactions']

    merged_agg_dat = cc_agg_dat.merge(loyalty_agg_dat, on='location', how='outer')
    merged_agg_dat= merged_agg_dat.fillna(0)

    # print(merged_agg_dat)

    # merged_agg_dat.to_csv('malin_aggregation.csv', index=False)

    return merged_agg_dat.to_json(orient='records')

@app.route("/link_node_graph", methods=['POST'])
def link_node_data_2():
    global car, stops

    data = json.loads(request.data, encoding='utf-8')
    start_date = datetime.strptime(data['start_date'], "%Y-%m-%d %H:%M:%S")
    end_date = datetime.strptime(data['end_date'], "%Y-%m-%d %H:%M:%S")
    location_list = data['location']

    nodes = car[['name', 'id']]

    edges = pd.DataFrame(columns=['name','name2','weights'])

    stop_data = stops.loc[stops['st']>=start_date].loc[stops['st']<=end_date]

    stop_data = stop_data[stop_data['location'].isin(location_list)]

    merged_df = pd.merge(stop_data, stop_data, on=['location'])

    overlap_df = merged_df[(merged_df['st_x'] <= merged_df['et_y']) & (merged_df['st_y'] <= merged_df['et_x']) & (merged_df['id_x'] != merged_df['id_y'])]

    num_overlaps = overlap_df.groupby(['id_x', 'id_y']).size().reset_index(name='count')


    merged_df1 = pd.merge(num_overlaps, nodes, left_on='id_x', right_on='id')
    merged_df2 = pd.merge(merged_df1, nodes, left_on='id_y', right_on='id')

    result_df = merged_df2[['name_x', 'name_y', 'count']].rename(columns={'name_x': 'name', 'name_y': 'name2', 'count':'weights'})

    return json.dumps({"nodes": json.loads(nodes.to_json(orient='records')), "edges":json.loads(result_df.to_json(orient='records'))})

@app.route("/heat_map", methods=['POST'])
def heat_map():
    global cc_dat_original, stops, car

    data = json.loads(request.data)
    start_date = datetime.strptime(data['start_date'], "%Y-%m-%d %H:%M:%S")
    end_date = datetime.strptime(data['end_date'], "%Y-%m-%d %H:%M:%S")
    location_list = data['location']


    filtered_df = stops[stops['location'].isin(location_list)]

    filtered_df = filtered_df.loc[filtered_df['st']>=start_date].loc[filtered_df['st']<=end_date]

    merged_df = pd.merge(filtered_df, cc_dat_original, on="location")

    merged_df = merged_df[(merged_df['st']<=merged_df['timestamp']) & (merged_df['timestamp']<=merged_df['et'])]

    num_overlaps = merged_df.groupby(['id','last4ccnum']).size().reset_index(name='count')

    result_df = pd.merge(num_overlaps, car, on=['id'])

    # print(list(result_df['name'].unique()))
    # print(list(result_df['last4ccnum'].unique()))
    # print(result_df[['name','last4ccnum','count']])

    return json.dumps({'people':result_df['name'].unique().tolist(), 'cards': result_df['last4ccnum'].unique().tolist(), 'data': result_df[['name','last4ccnum','count']].to_dict('records')})
    # return json.dumps({"people": json.dumps(list(result_df['name'].unique())), "cards": json.dumps(list(result_df['last4ccnum'].unique())), "data":json.loads(result_df[['name','last4ccnum','count']].to_json(orient='records'))})

@app.route("/heat_map_2", methods=['POST'])
def heat_map_2():
    global loyalty_dat_original, cc_dat_original

    data = json.loads(request.data)
    start_date = datetime.strptime(data['start_date'], "%Y-%m-%d %H:%M:%S").date()
    end_date = datetime.strptime(data['end_date'], "%Y-%m-%d %H:%M:%S").date()
    location_list = data['location']

    filtered_cc = cc_dat_original[cc_dat_original['location'].isin(location_list)]
    filtered_loyalty = loyalty_dat_original[loyalty_dat_original['location'].isin(location_list)]

    filtered_cc = filtered_cc.loc[filtered_cc['date']>=start_date].loc[filtered_cc['date']<=end_date]
    filtered_loyalty = filtered_loyalty.loc[filtered_loyalty['date']>=start_date].loc[filtered_loyalty['date']<=end_date]

    merged_df = pd.merge(filtered_cc, filtered_loyalty, left_on=['location', 'date', 'price'], right_on=['location', 'date', 'price'])

    num_overlaps = merged_df.groupby(['last4ccnum', 'loyaltynum']).size().reset_index(name='count')

    return json.dumps({'cc':num_overlaps['last4ccnum'].unique().tolist(), 'loyalty': num_overlaps['loyaltynum'].unique().tolist(), 'data': num_overlaps.to_dict('records')})

# main driver function
if __name__ == '__main__':
    # run() method of Flask class runs the application
    # on the local development server.
    app.run(debug=True)