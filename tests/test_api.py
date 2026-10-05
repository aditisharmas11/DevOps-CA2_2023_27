from conftest import SAMPLE_PASSENGER


def test_health_and_ready(client):
    assert client.get('/health').json() == {'status': 'ok'}
    assert client.get('/ready').status_code == 200


def test_version_reports_app_version(client):
    body = client.get('/version').json()
    assert body['app_version'] == 'test'
    assert body['model_metrics']['roc_auc'] > 0.9


def test_happy_business_passenger_is_satisfied(client):
    body = client.post('/predict', json=SAMPLE_PASSENGER).json()
    assert body['prediction'] == 'satisfied'
    assert 0.5 <= body['satisfied_probability'] <= 1


def test_unhappy_personal_passenger_is_dissatisfied(client):
    unhappy = {**SAMPLE_PASSENGER, 'Type of Travel': 'Personal Travel', 'Class': 'Eco',
               'Customer Type': 'disloyal Customer', 'Departure Delay in Minutes': 120}
    for column in ['Inflight wifi service', 'Online boarding', 'Seat comfort', 'Inflight entertainment',
                   'Leg room service', 'On-board service', 'Cleanliness']:
        unhappy[column] = 1
    assert client.post('/predict', json=unhappy).json()['prediction'] == 'neutral or dissatisfied'


def test_missing_numeric_fields_are_imputed(client):
    partial = {k: SAMPLE_PASSENGER[k] for k in ['Gender', 'Customer Type', 'Type of Travel', 'Class']}
    assert client.post('/predict', json=partial).status_code == 200


def test_invalid_input_is_rejected(client):
    assert client.post('/predict', json={**SAMPLE_PASSENGER, 'Class': 'First'}).status_code == 422
    assert client.post('/predict', json={**SAMPLE_PASSENGER, 'Seat comfort': 9}).status_code == 422


def test_batch_prediction(client):
    response = client.post('/predict/batch', json={'passengers': [SAMPLE_PASSENGER] * 3})
    assert response.status_code == 200
    assert len(response.json()) == 3


def test_metrics_are_exposed(client):
    client.post('/predict', json=SAMPLE_PASSENGER)
    text = client.get('/metrics').text
    assert 'airline_api_http_requests_total{method="POST",path="/predict",status="200"}' in text
    assert 'airline_api_http_request_duration_seconds_bucket' in text
    assert 'airline_api_predictions_total' in text
    assert 'airline_api_model_loaded 1.0' in text


def test_not_ready_without_model(client_without_model):
    assert client_without_model.get('/health').status_code == 200
    assert client_without_model.get('/ready').status_code == 503
    assert client_without_model.post('/predict', json=SAMPLE_PASSENGER).status_code == 503
